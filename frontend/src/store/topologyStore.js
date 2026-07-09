import { create } from 'zustand';
import { createPacket } from '../engine/packetMovement';
import { buildArpTable, simulateArpSpoof } from '../engine/arpSpoofing';
import { buildDnsTable, simulateDnsPoison } from '../engine/dnsPoisoning';
import { postSecurityEvent } from '../api/client';
import { useAuthStore } from './authStore';

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

  addLink: (sourceId, targetId) =>
    set((state) => {
      const alreadyExists = state.links.some(
        (link) =>
          (link.sourceDeviceId === sourceId && link.targetDeviceId === targetId) ||
          (link.sourceDeviceId === targetId && link.targetDeviceId === sourceId),
      );

      if (alreadyExists) {
        return state;
      }

      linkIdCounter += 1;

      const link = {
        id: `link-${linkIdCounter}`,
        sourceDeviceId: sourceId,
        targetDeviceId: targetId,
      };

      const links = [...state.links, link];

      return { links, arpTables: buildArpTable(state.devices, links) };
    }),

  removeLink: (id) =>
    set((state) => {
      const links = state.links.filter((link) => link.id !== id);

      return { links, arpTables: buildArpTable(state.devices, links) };
    }),

  setConnectingFromDeviceId: (id) => set({ connectingFromDeviceId: id }),

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
      console.warn('Cannot trigger ARP spoof: one or more devices not found');
      return;
    }

    set((state) => {
      const arpTables = simulateArpSpoof(
        state.arpTables,
        attackerDeviceId,
        victimDeviceId,
        impersonatedDeviceId,
      );

      const logEntry = {
        timestamp: Date.now(),
        attackerDeviceId,
        victimDeviceId,
        impersonatedDeviceId,
      };

      return { arpTables, arpAttackLog: [...state.arpAttackLog, logEntry] };
    });

    const token = useAuthStore.getState().token;

    postSecurityEvent(token, {
      eventType: 'arp_spoof',
      attackerDeviceId,
      victimDeviceId,
      impersonatedDeviceId,
    }).catch((error) => console.error('Failed to send security event', error));
  },

  triggerDnsPoison: (attackerDeviceId, victimDeviceId, targetDomain, fakeIp) => {
    const devices = get().devices;
    const devicesExist = [attackerDeviceId, victimDeviceId].every((id) =>
      devices.some((device) => device.id === id),
    );

    if (!devicesExist) {
      console.warn('Cannot trigger DNS poison: one or more devices not found');
      return;
    }

    set((state) => {
      const dnsTables = simulateDnsPoison(
        state.dnsTables,
        attackerDeviceId,
        victimDeviceId,
        targetDomain,
        fakeIp,
      );

      return { dnsTables };
    });

    const token = useAuthStore.getState().token;

    postSecurityEvent(token, {
      eventType: 'dns_poison',
      attackerDeviceId,
      victimDeviceId,
      details: { targetDomain, fakeIp },
    }).catch((error) => console.error('Failed to send security event', error));
  },
}));
