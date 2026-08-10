import { create } from 'zustand';
import { createPacket } from '../engine/packetMovement';
import { buildArpTable, simulateArpSpoof, clearArpPoison } from '../engine/arpSpoofing';
import { buildDnsTable, simulateDnsPoison, clearDnsPoison } from '../engine/dnsPoisoning';
import { postSecurityEvent } from '../api/client';
import { getMaxConnections, isImmuneToAttack } from '../engine/deviceCapabilities';
import { canBeAttacker, canBeVictim, canBeImpersonated } from '../engine/attackRoles';
import { isValidConnectionType, getDefaultSpeed } from '../engine/connectionCapabilities';
import {
  buildPingRoute,
  buildRoundTripPath,
  calculatePingLatencyMs,
  describeLinkTypes,
  describeLinkDetail,
  getImmediateNeighborId,
  isAttackerOnSameSegment,
  findPath,
} from '../engine/pingRouting';

let deviceIdCounter = 0;

function randomUniqueIp(existingIps) {
  const usedIps = new Set(existingIps);
  let candidate;

  do {
    candidate = `192.168.1.${Math.floor(Math.random() * 253) + 2}`;
  } while (usedIps.has(candidate));

  return candidate;
}

function randomMac() {
  const segments = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  );

  return segments.join(':');
}

let linkIdCounter = 0;

export const useTopologyStore = create((set, get) => ({
  devices: [],
  deviceCounts: {},
  links: [],
  connectingFromDeviceId: null,
  pendingLinkType: 'standard',
  activePackets: [],
  arpTables: {},
  arpAttackLog: [],
  dnsTables: {},
  dnsAttackLog: [],
  toasts: [],

  pushToast: (message, type = 'success') =>
    set((state) => ({
      toasts: [...state.toasts, { id: `toast-${Date.now()}-${Math.random()}`, message, type }],
    })),

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  addDevice: (type, x, y) => {
    deviceIdCounter += 1;

    set((state) => {
      const typeCount = (state.deviceCounts[type] ?? 0) + 1;

      const device = {
        id: `device-${deviceIdCounter}`,
        type,
        x,
        y,
        name: `${type}-${typeCount}`,
        mac: randomMac(),
        ...(type !== 'switch'
          ? { ip: randomUniqueIp(state.devices.map((existing) => existing.ip)) }
          : {}),
      };

      const devices = [...state.devices, device];

      return {
        devices,
        deviceCounts: { ...state.deviceCounts, [type]: typeCount },
        arpTables: buildArpTable(devices, state.links),
        dnsTables: buildDnsTable(devices),
      };
    });
  },

  updateDevicePosition: (id, x, y) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === id ? { ...device, x, y } : device,
      ),
    })),

  updateDeviceProperties: (id, updates) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === id ? { ...device, ...updates } : device,
      ),
    })),

  removeDevice: (id) =>
    set((state) => {
      const devices = state.devices.filter((device) => device.id !== id);
      const links = state.links.filter(
        (link) => link.sourceDeviceId !== id && link.targetDeviceId !== id,
      );
      const activePackets = state.activePackets.filter(
        (packet) =>
          packet.sourceNodeId !== id &&
          packet.targetNodeId !== id &&
          !packet.path.includes(id),
      );
      const connectingFromDeviceId =
        state.connectingFromDeviceId === id ? null : state.connectingFromDeviceId;

      return {
        devices,
        links,
        activePackets,
        connectingFromDeviceId,
        arpTables: buildArpTable(devices, links),
        dnsTables: buildDnsTable(devices),
      };
    }),

  addLink: (sourceId, targetId, type = 'standard') => {
    const devices = get().devices;
    const sourceDevice = devices.find((device) => device.id === sourceId);
    const targetDevice = devices.find((device) => device.id === targetId);

    if (!sourceDevice || !targetDevice) {
      const reason = 'Cannot add link: one or both devices not found';
      console.warn(reason);
      return { success: false, reason };
    }

    if (type !== 'standard' && !isValidConnectionType(type, sourceDevice.type, targetDevice.type)) {
      const reason = `Cannot add link: connection type '${type}' is not valid between ${sourceDevice.name} (${sourceDevice.type}) and ${targetDevice.name} (${targetDevice.type})`;
      console.warn(reason);
      return { success: false, reason };
    }

    let result = { success: true };

    set((state) => {
      const countConnections = (deviceId) =>
        state.links.filter(
          (link) => link.sourceDeviceId === deviceId || link.targetDeviceId === deviceId,
        ).length;

      const sourceMax = getMaxConnections(sourceDevice.type);
      const targetMax = getMaxConnections(targetDevice.type);

      if (countConnections(sourceId) >= sourceMax) {
        result = {
          success: false,
          reason: `Cannot add link: ${sourceDevice.name} (${sourceDevice.type}) already has the maximum of ${sourceMax} connection(s)`,
        };
        return state;
      }

      if (countConnections(targetId) >= targetMax) {
        result = {
          success: false,
          reason: `Cannot add link: ${targetDevice.name} (${targetDevice.type}) already has the maximum of ${targetMax} connection(s)`,
        };
        return state;
      }

      const alreadyExists = state.links.some(
        (link) =>
          (link.sourceDeviceId === sourceId && link.targetDeviceId === targetId) ||
          (link.sourceDeviceId === targetId && link.targetDeviceId === sourceId),
      );

      if (alreadyExists) {
        result = { success: false, reason: 'Link already exists' };
        return state;
      }

      linkIdCounter += 1;

      const link = {
        id: `link-${linkIdCounter}`,
        sourceDeviceId: sourceId,
        targetDeviceId: targetId,
        type,
        enabled: true,
        speed: getDefaultSpeed(type),
      };

      const links = [...state.links, link];

      return { links, arpTables: buildArpTable(state.devices, links) };
    });

    if (!result.success) {
      console.warn(result.reason);
    }

    return result;
  },

  removeLink: (id) =>
    set((state) => {
      const links = state.links.filter((link) => link.id !== id);

      return { links, arpTables: buildArpTable(state.devices, links) };
    }),

  setLinkEnabled: (id, enabled) =>
    set((state) => ({
      links: state.links.map((link) => (link.id === id ? { ...link, enabled } : link)),
    })),

  setLinkSpeed: (id, speed) =>
    set((state) => ({
      links: state.links.map((link) => (link.id === id ? { ...link, speed } : link)),
    })),

  clearTopology: () =>
    set({
      devices: [],
      links: [],
      connectingFromDeviceId: null,
      activePackets: [],
      arpTables: {},
      arpAttackLog: [],
      dnsTables: {},
      dnsAttackLog: [],
    }),

  setConnectingFromDeviceId: (id) => set({ connectingFromDeviceId: id }),

  setPendingLinkType: (type) => set({ pendingLinkType: type }),

  sendPacket: (sourceDeviceId, targetDeviceId) => {
    const devices = get().devices;
    const devicesExist =
      devices.some((device) => device.id === sourceDeviceId) &&
      devices.some((device) => device.id === targetDeviceId);

    if (!devicesExist) {
      console.warn(`Cannot send packet: device not found (${sourceDeviceId} -> ${targetDeviceId})`);
      return;
    }

    set((state) => {
      const hasDirectLink = state.links.some(
        (link) =>
          link.enabled !== false &&
          ((link.sourceDeviceId === sourceDeviceId && link.targetDeviceId === targetDeviceId) ||
            (link.sourceDeviceId === targetDeviceId && link.targetDeviceId === sourceDeviceId)),
      );

      if (!hasDirectLink) {
        console.warn(`No direct link between ${sourceDeviceId} and ${targetDeviceId}`);
        return state;
      }

      const packet = createPacket(sourceDeviceId, targetDeviceId, [sourceDeviceId, targetDeviceId]);

      return { activePackets: [...state.activePackets, packet] };
    });
  },

  pingDevice: (sourceDeviceId, targetDeviceId) => {
    const state = get();
    const enabledLinks = state.links.filter((link) => link.enabled !== false);
    const route = buildPingRoute(
      sourceDeviceId,
      targetDeviceId,
      state.devices,
      enabledLinks,
      state.arpTables,
      state.dnsTables,
    );

    if (!route.success) {
      return {
        success: false,
        deviceId: targetDeviceId,
        reason: route.reason,
        message: route.message,
      };
    }

    const fullPath = buildRoundTripPath(route.path);
    const latencyMs =
      calculatePingLatencyMs(route.path, state.links) +
      calculatePingLatencyMs([...route.path].reverse(), state.links);
    const linkTypeSummary = describeLinkTypes(route.path, state.links);
    const linkDetail = describeLinkDetail(route.path, state.links);

    const packet = createPacket(sourceDeviceId, targetDeviceId, fullPath);

    set((s) => ({ activePackets: [...s.activePackets, packet] }));

    return {
      success: true,
      deviceId: targetDeviceId,
      path: route.path,
      hops: route.hops,
      latencyMs,
      mitm: route.mitm,
      linkTypeSummary,
      linkDetail,
      packetId: packet.id,
    };
  },

  removePacket: (id) =>
    set((state) => ({
      activePackets: state.activePackets.filter((packet) => packet.id !== id),
    })),

  updatePacketState: (id, newPacketObject) =>
    set((state) => ({
      activePackets: state.activePackets.map((packet) =>
        packet.id === id ? newPacketObject : packet,
      ),
    })),

  triggerArpSpoof: (attackerDeviceId, victimDeviceId, impersonatedDeviceId, bidirectional = false) => {
    const devices = get().devices;
    const devicesExist = [attackerDeviceId, victimDeviceId, impersonatedDeviceId].every((id) =>
      devices.some((device) => device.id === id),
    );

    if (!devicesExist) {
      const reason = 'Cannot trigger ARP spoof: one or more devices not found';
      console.warn(reason);
      return { success: false, reason };
    }

    if (
      attackerDeviceId === victimDeviceId ||
      attackerDeviceId === impersonatedDeviceId ||
      victimDeviceId === impersonatedDeviceId
    ) {
      const reason = 'Cannot trigger ARP spoof: attacker, victim, and impersonated device must all be different';
      console.warn(reason);
      return { success: false, reason };
    }

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);
    const impersonated = devices.find((device) => device.id === impersonatedDeviceId);

    if (!canBeAttacker(attacker.type)) {
      const reason = `Cannot trigger ARP spoof: ${attacker.name} (${attacker.type}) cannot act as an attacker`;
      console.warn(reason);
      return { success: false, reason };
    }

    if (!canBeVictim(victim.type)) {
      const reason = `Cannot trigger ARP spoof: ${victim.name} (${victim.type}) cannot be targeted as a victim`;
      console.warn(reason);
      return { success: false, reason };
    }

    if (!canBeImpersonated(impersonated.type)) {
      const reason = `Cannot trigger ARP spoof: ${impersonated.name} (${impersonated.type}) cannot be impersonated`;
      console.warn(reason);
      return { success: false, reason };
    }

    const victimNeighborId = getImmediateNeighborId(victimDeviceId, get().links);

    if (!isAttackerOnSameSegment(attackerDeviceId, victimNeighborId, get().links)) {
      const reason = `Cannot trigger ARP spoof: ${attacker.name} is not on the same local network segment as ${victim.name}`;
      console.warn(reason);
      return { success: false, reason };
    }

    if (bidirectional) {
      const impersonatedNeighborId = getImmediateNeighborId(impersonatedDeviceId, get().links);

      if (!isAttackerOnSameSegment(attackerDeviceId, impersonatedNeighborId, get().links)) {
        const reason = `Cannot trigger bidirectional ARP spoof: ${attacker.name} is not on the same local network segment as ${impersonated.name}`;
        console.warn(reason);
        return { success: false, reason };
      }
    }

    const isBlockedForward = isImmuneToAttack(victim.type, 'arp_spoof');
    const isBlockedReverse = bidirectional && isImmuneToAttack(impersonated.type, 'arp_spoof');

    set((state) => {
      let arpTables = isBlockedForward
        ? state.arpTables
        : simulateArpSpoof(state.arpTables, attackerDeviceId, victimDeviceId, impersonatedDeviceId);

      const logEntries = [
        {
          timestamp: Date.now(),
          attackerDeviceId,
          victimDeviceId,
          impersonatedDeviceId,
          blocked: isBlockedForward,
        },
      ];

      if (bidirectional) {
        arpTables = isBlockedReverse
          ? arpTables
          : simulateArpSpoof(arpTables, attackerDeviceId, impersonatedDeviceId, victimDeviceId);

        logEntries.push({
          timestamp: Date.now(),
          attackerDeviceId,
          victimDeviceId: impersonatedDeviceId,
          impersonatedDeviceId: victimDeviceId,
          blocked: isBlockedReverse,
        });
      }

      return { arpTables, arpAttackLog: [...state.arpAttackLog, ...logEntries] };
    });

    postSecurityEvent({
      eventType: isBlockedForward ? 'firewall_blocked_arp_spoof' : 'arp_spoof',
      attackerDeviceId,
      victimDeviceId,
      impersonatedDeviceId,
    }).catch((error) => console.error('Failed to send security event', error));

    if (bidirectional) {
      postSecurityEvent({
        eventType: isBlockedReverse ? 'firewall_blocked_arp_spoof' : 'arp_spoof',
        attackerDeviceId,
        victimDeviceId: impersonatedDeviceId,
        impersonatedDeviceId: victimDeviceId,
      }).catch((error) => console.error('Failed to send security event', error));
    }

    return { success: true };
  },

  stopArpSpoof: (victimDeviceId, impersonatedDeviceId) => {
    const devices = get().devices;
    const victim = devices.find((device) => device.id === victimDeviceId);
    const impersonated = devices.find((device) => device.id === impersonatedDeviceId);

    if (!victim || !impersonated) {
      const reason = 'Cannot stop ARP spoof: one or more devices not found';
      console.warn(reason);
      return { success: false, reason };
    }

    set((state) => {
      let arpTables = clearArpPoison(state.arpTables, victimDeviceId, impersonatedDeviceId);
      arpTables = clearArpPoison(arpTables, impersonatedDeviceId, victimDeviceId);
      return { arpTables };
    });

    return { success: true };
  },

  triggerDnsPoison: (attackerDeviceId, victimDeviceId, targetDomain, fakeIp) => {
    const devices = get().devices;
    const devicesExist = [attackerDeviceId, victimDeviceId].every((id) =>
      devices.some((device) => device.id === id),
    );

    if (!devicesExist) {
      const reason = 'Cannot trigger DNS poison: one or more devices not found';
      console.warn(reason);
      return { success: false, reason };
    }

    if (attackerDeviceId === victimDeviceId) {
      const reason = 'Cannot trigger DNS poison: attacker and victim device must be different';
      console.warn(reason);
      return { success: false, reason };
    }

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);

    if (!canBeAttacker(attacker.type)) {
      const reason = `Cannot trigger DNS poison: ${attacker.name} (${attacker.type}) cannot act as an attacker`;
      console.warn(reason);
      return { success: false, reason };
    }

    if (!canBeVictim(victim.type)) {
      const reason = `Cannot trigger DNS poison: ${victim.name} (${victim.type}) cannot be targeted as a victim`;
      console.warn(reason);
      return { success: false, reason };
    }

    const impersonatedDevice = devices.find((device) => device.ip === fakeIp);

    if (!impersonatedDevice) {
      const reason = `Cannot trigger DNS poison: ${fakeIp} does not match any device's real IP address in the topology`;
      console.warn(reason);
      return { success: false, reason };
    }

    if (!findPath(devices, get().links, victimDeviceId, impersonatedDevice.id)) {
      const reason = `Cannot trigger DNS poison: ${victim.name} has no network path to the device at ${fakeIp}`;
      console.warn(reason);
      return { success: false, reason };
    }

    const isBlocked = isImmuneToAttack(victim.type, 'dns_poison');

    set((state) => {
      const dnsTables = isBlocked
        ? state.dnsTables
        : simulateDnsPoison(state.dnsTables, attackerDeviceId, victimDeviceId, targetDomain, fakeIp);

      const logEntry = {
        timestamp: Date.now(),
        attackerDeviceId,
        victimDeviceId,
        blocked: isBlocked,
      };

      return { dnsTables, dnsAttackLog: [...state.dnsAttackLog, logEntry] };
    });

    postSecurityEvent({
      eventType: isBlocked ? 'firewall_blocked_dns_spoof' : 'dns_poison',
      attackerDeviceId,
      victimDeviceId,
      details: { targetDomain, fakeIp },
    }).catch((error) => console.error('Failed to send security event', error));

    return { success: true };
  },

  stopDnsPoison: (victimDeviceId, targetDomain) => {
    const devices = get().devices;
    const victim = devices.find((device) => device.id === victimDeviceId);

    if (!victim) {
      const reason = 'Cannot stop DNS poison: device not found';
      console.warn(reason);
      return { success: false, reason };
    }

    set((state) => ({
      dnsTables: clearDnsPoison(state.dnsTables, victimDeviceId, targetDomain),
    }));

    return { success: true };
  },
}));
