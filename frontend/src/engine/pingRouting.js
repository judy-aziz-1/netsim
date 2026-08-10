import { canForward } from './deviceCapabilities';
import { formatSpeedLabel } from './connectionCapabilities';

function buildAdjacency(links) {
  const adjacency = new Map();

  links.forEach((link) => {
    if (!adjacency.has(link.sourceDeviceId)) adjacency.set(link.sourceDeviceId, []);
    if (!adjacency.has(link.targetDeviceId)) adjacency.set(link.targetDeviceId, []);
    adjacency.get(link.sourceDeviceId).push(link.targetDeviceId);
    adjacency.get(link.targetDeviceId).push(link.sourceDeviceId);
  });

  return adjacency;
}

export function findPath(devices, links, sourceId, targetId, { relayDeviceIds = [] } = {}) {
  const deviceById = new Map(devices.map((device) => [device.id, device]));

  if (!deviceById.has(sourceId) || !deviceById.has(targetId)) {
    return null;
  }

  if (sourceId === targetId) {
    return [sourceId];
  }

  const relaySet = new Set(relayDeviceIds);
  const adjacency = buildAdjacency(links);

  const queue = [sourceId];
  const visited = new Set([sourceId]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();

    const canPassThrough =
      current === sourceId || canForward(deviceById.get(current)?.type) || relaySet.has(current);

    if (!canPassThrough) {
      continue;
    }

    const neighbors = adjacency.get(current) ?? [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      parent.set(neighborId, current);
      queue.push(neighborId);
    }
  }

  if (!visited.has(targetId)) {
    return null;
  }

  const path = [targetId];
  let node = targetId;

  while (node !== sourceId) {
    node = parent.get(node);
    path.unshift(node);
  }

  return path;
}

export function getImmediateNeighborId(deviceId, links) {
  const link = links.find(
    (candidate) => candidate.sourceDeviceId === deviceId || candidate.targetDeviceId === deviceId,
  );

  if (!link) {
    return null;
  }

  return link.sourceDeviceId === deviceId ? link.targetDeviceId : link.sourceDeviceId;
}

export function isAttackerOnSameSegment(attackerDeviceId, referenceDeviceId, links) {
  if (!attackerDeviceId || !referenceDeviceId) {
    return false;
  }

  if (attackerDeviceId === referenceDeviceId) {
    return true;
  }

  return links.some(
    (link) =>
      (link.sourceDeviceId === referenceDeviceId && link.targetDeviceId === attackerDeviceId) ||
      (link.sourceDeviceId === attackerDeviceId && link.targetDeviceId === referenceDeviceId),
  );
}

export function findMitmRedirect(sourceId, targetId, devices, links, arpTables, dnsTables) {
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const realPath = findPath(devices, links, sourceId, targetId);

  if (!realPath || realPath.length < 2) {
    return { mitm: false };
  }

  // The immediate physical neighbor defines the L2 segment boundary (this is
  // who the attacker must share a link with to inject spoofed ARP replies),
  // while the actual ARP *resolution target* is the first IP-bearing device
  // along the path — switches are transparent at L2 and never get ARP'd for
  // directly, so a switch hop is skipped when looking for what the source
  // would really resolve via ARP (typically the gateway/router beyond it).
  const immediateNeighbor = deviceById.get(realPath[1]);

  let ipHopIndex = 1;
  while (ipHopIndex < realPath.length && !deviceById.get(realPath[ipHopIndex])?.ip) {
    ipHopIndex += 1;
  }
  const arpResolutionTarget = deviceById.get(realPath[ipHopIndex]);

  const sourceArpTable = arpTables?.[sourceId];

  if (sourceArpTable && arpResolutionTarget) {
    const storedMac = sourceArpTable[arpResolutionTarget.ip];

    if (storedMac && storedMac !== arpResolutionTarget.mac) {
      const attacker = devices.find((device) => device.mac === storedMac);
      const attackerOnSameSegment =
        attacker && immediateNeighbor && isAttackerOnSameSegment(attacker.id, immediateNeighbor.id, links);

      if (attacker && attackerOnSameSegment) {
        return { mitm: true, via: 'arp', attackerDeviceId: attacker.id };
      }
    }
  }

  const sourceDnsTable = dnsTables?.[sourceId];
  const targetDevice = deviceById.get(targetId);

  if (sourceDnsTable && targetDevice) {
    const hostname = `${targetDevice.name}.local`;
    const storedIp = sourceDnsTable[hostname];

    if (storedIp && storedIp !== targetDevice.ip) {
      const attacker = devices.find((device) => device.ip === storedIp);
      const attackerReachable = attacker && findPath(devices, links, sourceId, attacker.id);

      if (attacker && attackerReachable) {
        return { mitm: true, via: 'dns', attackerDeviceId: attacker.id };
      }
    }
  }

  return { mitm: false };
}

export function buildPingRoute(sourceId, targetId, devices, links, arpTables, dnsTables) {
  const deviceById = new Map(devices.map((device) => [device.id, device]));

  if (!deviceById.has(sourceId) || !deviceById.has(targetId)) {
    return {
      success: false,
      reason: 'device_not_found',
      message: 'Select both source and target devices',
    };
  }

  const redirect = findMitmRedirect(sourceId, targetId, devices, links, arpTables, dnsTables);

  if (redirect.mitm) {
    const pathToAttacker = findPath(devices, links, sourceId, redirect.attackerDeviceId);

    if (pathToAttacker) {
      const relayPath = findPath(devices, links, redirect.attackerDeviceId, targetId, {
        relayDeviceIds: [redirect.attackerDeviceId],
      });

      const fullPath = relayPath ? pathToAttacker.concat(relayPath.slice(1)) : pathToAttacker;

      return {
        success: true,
        path: fullPath,
        hops: fullPath.length - 1,
        mitm: true,
        via: redirect.via,
        attackerDeviceId: redirect.attackerDeviceId,
      };
    }
  }

  const path = findPath(devices, links, sourceId, targetId);

  if (!path) {
    return {
      success: false,
      reason: 'no_path',
      message: 'No path found - devices not connected',
    };
  }

  return { success: true, path, hops: path.length - 1, mitm: false };
}

// Reference point chosen so that a link with no explicit `speed` (legacy/test
// fixtures) reproduces the old fixed standard-link range (3-8ms) exactly:
// REFERENCE_LATENCY_MS * (REFERENCE_SPEED_MBPS / 100) * [0.55, 1.45)
//   = 5.5 * 1 * [0.55, 1.45) = [3.025, 7.975)ms.
// This fallback is a defensive default for the pure engine function only —
// it is intentionally different from `getDefaultSpeed()` in
// connectionCapabilities.js, which is the real speed assigned to brand-new
// links created through the store.
const REFERENCE_SPEED_MBPS = 100;
const REFERENCE_LATENCY_MS = 5.5;
const FALLBACK_SPEED_BY_TYPE = { standard: 100, backbone: 1000 };

function calculateHopLatencyMs(speedMbps) {
  const scaled = REFERENCE_LATENCY_MS * (REFERENCE_SPEED_MBPS / speedMbps);
  const jitter = 0.55 + Math.random() * 0.9;
  return scaled * jitter;
}

function getPathLinks(path, links) {
  const hopLinks = [];

  for (let i = 0; i < path.length - 1; i += 1) {
    const link = links.find(
      (candidate) =>
        (candidate.sourceDeviceId === path[i] && candidate.targetDeviceId === path[i + 1]) ||
        (candidate.sourceDeviceId === path[i + 1] && candidate.targetDeviceId === path[i]),
    );
    hopLinks.push(link);
  }

  return hopLinks;
}

export function calculatePingLatencyMs(path, links) {
  let total = 0;

  getPathLinks(path, links).forEach((link) => {
    const speedMbps = link?.speed ?? FALLBACK_SPEED_BY_TYPE[link?.type] ?? FALLBACK_SPEED_BY_TYPE.standard;
    total += calculateHopLatencyMs(speedMbps);
  });

  return total;
}

export function buildRoundTripPath(path) {
  return path.concat(path.slice(0, -1).reverse());
}

export function describeLinkTypes(path, links) {
  const types = new Set();

  getPathLinks(path, links).forEach((link) => {
    types.add(link?.type === 'backbone' ? 'backbone' : 'standard');
  });

  if (types.size === 0) {
    return 'standard';
  }

  if (types.size > 1) {
    return 'mixed';
  }

  return [...types][0];
}

export function describeLinkDetail(path, links) {
  const segments = getPathLinks(path, links).map((link) => {
    const type = link?.type === 'backbone' ? 'backbone' : 'standard';
    const speed = link?.speed ?? FALLBACK_SPEED_BY_TYPE[type];
    return { type, speed };
  });

  const labels = [];
  segments.forEach((segment) => {
    const previous = labels[labels.length - 1];
    if (previous && previous.type === segment.type && previous.speed === segment.speed) {
      return;
    }
    labels.push(segment);
  });

  return labels
    .map((segment) => `${segment.type === 'backbone' ? 'Backbone' : 'Standard'} @${formatSpeedLabel(segment.speed)}`)
    .join(' → ');
}
