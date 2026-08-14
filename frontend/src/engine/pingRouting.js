import { canForward } from './deviceCapabilities';
import { formatSpeedLabel } from './connectionCapabilities';
import { buildArpTable } from './arpSpoofing';

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

// A device's own ARP table is already the definitive, order-independent list of
// who it can reach on its real local segment (buildArpTable's switch-transitive
// BFS). Deriving "same segment" from that — instead of picking one arbitrary
// link out of a possibly multi-linked device — means the answer never depends
// on which of a device's links happened to be created first.
export function isDeviceOnRealSegment(deviceId, referenceDeviceId, devices, links) {
  if (deviceId === referenceDeviceId) {
    return true;
  }

  const device = devices.find((candidate) => candidate.id === deviceId);

  if (!device || !device.ip) {
    return false;
  }

  const referenceTable = buildArpTable(devices, links)[referenceDeviceId];

  return Boolean(referenceTable && Object.prototype.hasOwnProperty.call(referenceTable, device.ip));
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

// Evaluates a single direction's routing decision (does fromId's own ARP/DNS
// table redirect its packets toward toId through an attacker, or go direct).
// Used for both the forward leg (source->target) and, independently, the
// reverse leg (target->source) — findMitmRedirect already keys every table
// lookup off its first argument, so calling it with the arguments swapped is
// enough to correctly check the *other* device's own table, with no changes
// to findMitmRedirect itself.
function buildLegRoute(fromId, toId, devices, links, arpTables, dnsTables) {
  const redirect = findMitmRedirect(fromId, toId, devices, links, arpTables, dnsTables);

  if (redirect.mitm) {
    const pathToAttacker = findPath(devices, links, fromId, redirect.attackerDeviceId);

    if (pathToAttacker) {
      const relayPath = findPath(devices, links, redirect.attackerDeviceId, toId, {
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

  const path = findPath(devices, links, fromId, toId);

  if (!path) {
    return {
      success: false,
      reason: 'no_path',
      message: 'No path found - devices not connected',
    };
  }

  return { success: true, path, hops: path.length - 1, mitm: false };
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

  const forward = buildLegRoute(sourceId, targetId, devices, links, arpTables, dnsTables);

  if (!forward.success) {
    return forward;
  }

  const reverse = buildLegRoute(targetId, sourceId, devices, links, arpTables, dnsTables);

  return {
    success: true,
    path: forward.path,
    hops: forward.hops,
    mitm: forward.mitm,
    via: forward.via,
    attackerDeviceId: forward.attackerDeviceId,
    reversePath: reverse.success ? reverse.path : [...forward.path].reverse(),
    reverseMitm: reverse.success ? reverse.mitm : false,
    reverseVia: reverse.success ? reverse.via : undefined,
    reverseAttackerDeviceId: reverse.success ? reverse.attackerDeviceId : undefined,
  };
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

export function buildRoundTripPath(forwardPath, reversePath) {
  return forwardPath.concat(reversePath.slice(1));
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
