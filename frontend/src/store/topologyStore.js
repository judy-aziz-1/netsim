import { create } from 'zustand';
import { createPacket } from '../engine/packetMovement';

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

export const useTopologyStore = create((set) => ({
  devices: [],
  links: [],
  connectingFromDeviceId: null,
  activePackets: [],

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

    set((state) => ({ devices: [...state.devices, device] }));
  },

  updateDevicePosition: (id, x, y) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === id ? { ...device, x, y } : device,
      ),
    })),

  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((device) => device.id !== id),
    })),

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

      return { links: [...state.links, link] };
    }),

  removeLink: (id) =>
    set((state) => ({
      links: state.links.filter((link) => link.id !== id),
    })),

  setConnectingFromDeviceId: (id) => set({ connectingFromDeviceId: id }),

  sendPacket: (sourceDeviceId, targetDeviceId) =>
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
    }),

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
}));
