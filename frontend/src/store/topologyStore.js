import { create } from 'zustand';
import { createPacket } from '../engine/packetMovement';
import { buildArpTable, simulateArpSpoof } from '../engine/arpSpoofing';
import { buildDnsTable, simulateDnsPoison } from '../engine/dnsPoisoning';
import { postSecurityEvent } from '../api/client';
import { getMaxConnections, isImmuneToAttack } from '../engine/deviceCapabilities';
import { canBeAttacker, canBeVictim } from '../engine/attackRoles';
import { isValidConnectionType } from '../engine/connectionCapabilities';

let deviceIdCounter = 0;

function randomIp() {
  return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
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
  links: [],
  connectingFromDeviceId: null,
  pendingLinkType: 'standard',
  activePackets: [],
  arpTables: {},
  arpAttackLog: [],
  dnsTables: {},

  addDevice: (type, x, y) => {
    deviceIdCounter += 1;

    const device = {
      id: `device-${deviceIdCounter}`,
      type,
      x,
      y,
      name: `${type}-${deviceIdCounter}`,
      ip: randomIp(),
      mac: randomMac(),
    };

    set((state) => {
      const devices = [...state.devices, device];

      return {
        devices,
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
          (link.sourceDeviceId === sourceDeviceId && link.targetDeviceId === targetDeviceId) ||
          (link.sourceDeviceId === targetDeviceId && link.targetDeviceId === sourceDeviceId),
      );

      if (!hasDirectLink) {
        console.warn(`No direct link between ${sourceDeviceId} and ${targetDeviceId}`);
        return state;
      }

      const packet = createPacket(sourceDeviceId, targetDeviceId, [sourceDeviceId, targetDeviceId]);

      return { activePackets: [...state.activePackets, packet] };
    });
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

  triggerArpSpoof: (attackerDeviceId, victimDeviceId, impersonatedDeviceId) => {
    const devices = get().devices;
    const devicesExist = [attackerDeviceId, victimDeviceId, impersonatedDeviceId].every((id) =>
      devices.some((device) => device.id === id),
    );

    if (!devicesExist) {
      const reason = 'Cannot trigger ARP spoof: one or more devices not found';
      console.warn(reason);
      return { success: false, reason };
    }

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);

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

    const isBlocked = isImmuneToAttack(victim.type, 'arp_spoof');

    set((state) => {
      const arpTables = isBlocked
        ? state.arpTables
        : simulateArpSpoof(state.arpTables, attackerDeviceId, victimDeviceId, impersonatedDeviceId);

      const logEntry = {
        timestamp: Date.now(),
        attackerDeviceId,
        victimDeviceId,
        impersonatedDeviceId,
        blocked: isBlocked,
      };

      return { arpTables, arpAttackLog: [...state.arpAttackLog, logEntry] };
    });

    postSecurityEvent({
      eventType: isBlocked ? 'firewall_blocked_arp_spoof' : 'arp_spoof',
      attackerDeviceId,
      victimDeviceId,
      impersonatedDeviceId,
    }).catch((error) => console.error('Failed to send security event', error));

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

    const isBlocked = isImmuneToAttack(victim.type, 'dns_poison');

    set((state) => {
      const dnsTables = isBlocked
        ? state.dnsTables
        : simulateDnsPoison(state.dnsTables, attackerDeviceId, victimDeviceId, targetDomain, fakeIp);

      return { dnsTables };
    });

    postSecurityEvent({
      eventType: isBlocked ? 'firewall_blocked_dns_spoof' : 'dns_poison',
      attackerDeviceId,
      victimDeviceId,
      details: { targetDomain, fakeIp },
    }).catch((error) => console.error('Failed to send security event', error));

    return { success: true };
  },
}));
