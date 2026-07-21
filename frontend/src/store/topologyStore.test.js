import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopologyStore } from './topologyStore';

beforeEach(() => {
  useTopologyStore.setState({
    devices: [],
    links: [],
    connectingFromDeviceId: null,
    activePackets: [],
    arpTables: {},
    arpAttackLog: [],
    dnsTables: {},
  });

  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  );
});

function lastDevice() {
  const devices = useTopologyStore.getState().devices;
  return devices[devices.length - 1];
}

describe('addDevice', () => {
  it('creates a server device with a valid ip and mac, same as pc', () => {
    useTopologyStore.getState().addDevice('server', 10, 20);
    const device = lastDevice();

    expect(device.type).toBe('server');
    expect(device.ip).toMatch(/^192\.168\.1\.\d{1,3}$/);
    expect(device.mac).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/);
  });

  it('creates an attacker device with a valid ip and mac', () => {
    useTopologyStore.getState().addDevice('attacker', 10, 20);
    const device = lastDevice();

    expect(device.type).toBe('attacker');
    expect(device.ip).toMatch(/^192\.168\.1\.\d{1,3}$/);
    expect(device.mac).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/);
  });
});

describe('addLink connection limits', () => {
  it('rejects a second link on a pc (max 1 connection)', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);

    const [pc1, pc2, pc3] = useTopologyStore.getState().devices;

    const first = addLink(pc1.id, pc2.id);
    expect(first).toEqual({ success: true });

    const second = addLink(pc1.id, pc3.id);
    expect(second.success).toBe(false);
    expect(second.reason).toMatch(/maximum of 1 connection/);

    expect(useTopologyStore.getState().links).toHaveLength(1);
  });

  it('allows a switch up to 24 connections and rejects the 25th', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('switch', 0, 0);
    for (let i = 0; i < 25; i += 1) {
      addDevice('pc', 0, 0);
    }

    const devices = useTopologyStore.getState().devices;
    const switchDevice = devices[0];
    const pcs = devices.slice(1);

    for (let i = 0; i < 24; i += 1) {
      const result = addLink(switchDevice.id, pcs[i].id);
      expect(result).toEqual({ success: true });
    }

    expect(useTopologyStore.getState().links).toHaveLength(24);

    const rejected = addLink(switchDevice.id, pcs[24].id);
    expect(rejected.success).toBe(false);
    expect(rejected.reason).toMatch(/maximum of 24 connection/);
    expect(useTopologyStore.getState().links).toHaveLength(24);
  });

  it('rejects linking a firewall beyond its max of 2 connections', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('firewall', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);

    const [firewall, pc1, pc2, pc3] = useTopologyStore.getState().devices;

    expect(addLink(firewall.id, pc1.id)).toEqual({ success: true });
    expect(addLink(firewall.id, pc2.id)).toEqual({ success: true });

    const rejected = addLink(firewall.id, pc3.id);
    expect(rejected.success).toBe(false);
    expect(useTopologyStore.getState().links).toHaveLength(2);
  });
});

describe('addLink connection types', () => {
  it('defaults new links to type standard when no type is passed', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);

    const [pc1, pc2] = useTopologyStore.getState().devices;

    expect(addLink(pc1.id, pc2.id)).toEqual({ success: true });
    expect(useTopologyStore.getState().links[0].type).toBe('standard');
  });

  it('allows a backbone link between two forwarding-capable devices (router/switch)', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('router', 0, 0);
    addDevice('switch', 0, 0);

    const [router, switchDevice] = useTopologyStore.getState().devices;

    const result = addLink(router.id, switchDevice.id, 'backbone');

    expect(result).toEqual({ success: true });
    expect(useTopologyStore.getState().links[0].type).toBe('backbone');
  });

  it('rejects a backbone link when one endpoint cannot forward (e.g. pc)', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [pc, router] = useTopologyStore.getState().devices;

    const result = addLink(pc.id, router.id, 'backbone');

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/not valid/);
    expect(useTopologyStore.getState().links).toHaveLength(0);
  });
});

describe('attack role guards', () => {
  it('rejects triggerArpSpoof when the attacker device is not of type attacker', () => {
    const { addDevice, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [pc1, pc2, router] = useTopologyStore.getState().devices;

    const result = triggerArpSpoof(pc1.id, pc2.id, router.id);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/cannot act as an attacker/);
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(0);
  });

  it('rejects triggerArpSpoof when the victim device is of type attacker', () => {
    const { addDevice, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);

    const [attacker1, attacker2, pc] = useTopologyStore.getState().devices;

    const result = triggerArpSpoof(attacker1.id, attacker2.id, pc.id);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/cannot be targeted as a victim/);
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(0);
  });

  it('allows triggerArpSpoof when attacker is type attacker and victim is a regular device', () => {
    const { addDevice, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [attacker, pc, router] = useTopologyStore.getState().devices;

    const result = triggerArpSpoof(attacker.id, pc.id, router.id);

    expect(result).toEqual({ success: true });
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(1);
    expect(useTopologyStore.getState().arpAttackLog[0].blocked).toBe(false);
  });

  it('still blocks (isImmuneToAttack) when victim is a firewall, independent of role checks', () => {
    const { addDevice, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('firewall', 0, 0);
    addDevice('pc', 0, 0);

    const [attacker, firewall, pc] = useTopologyStore.getState().devices;

    const result = triggerArpSpoof(attacker.id, firewall.id, pc.id);

    expect(result).toEqual({ success: true });
    expect(useTopologyStore.getState().arpAttackLog[0].blocked).toBe(true);
  });

  it('rejects triggerDnsPoison when the attacker device is not of type attacker', () => {
    const { addDevice, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [pc, server] = useTopologyStore.getState().devices;

    const result = triggerDnsPoison(pc.id, server.id, 'bank.com', '6.6.6.6');

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/cannot act as an attacker/);
  });
});
