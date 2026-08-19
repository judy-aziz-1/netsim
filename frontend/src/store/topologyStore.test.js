import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopologyStore } from './topologyStore';
import { buildArpTable, findActivePoisonings } from '../engine/arpSpoofing';
import { buildDnsTable, findActiveDnsPoisonings } from '../engine/dnsPoisoning';

beforeEach(() => {
  useTopologyStore.setState({
    devices: [],
    deviceCounts: {},
    links: [],
    connectingFromDeviceId: null,
    activePackets: [],
    arpTables: {},
    arpAttackLog: [],
    dnsTables: {},
    dnsAttackLog: [],
    toasts: [],
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

  it('gives each device type its own independent numbering (not a shared global counter)', () => {
    const { addDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const devices = useTopologyStore.getState().devices;
    expect(devices[0].name).toBe('pc-1');
    expect(devices[1].name).toBe('router-1');
  });

  it("keeps incrementing a type's counter after a device of that type is deleted", () => {
    const { addDevice, removeDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    const firstPc = useTopologyStore.getState().devices[0];
    removeDevice(firstPc.id);
    addDevice('pc', 0, 0);

    const secondPc = useTopologyStore.getState().devices[0];
    expect(secondPc.name).toBe('pc-2');
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
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);
    addDevice('switch', 0, 0);

    const [attacker, pc, router, switchDevice] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(router.id, switchDevice.id);

    const result = triggerArpSpoof(attacker.id, pc.id, router.id);

    expect(result).toEqual({ success: true, forwardBlocked: false, reverseBlocked: false });
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(1);
    expect(useTopologyStore.getState().arpAttackLog[0].blocked).toBe(false);
  });

  it('still blocks (isImmuneToAttack) when victim is a firewall, independent of role checks', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('firewall', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('switch', 0, 0);

    const [attacker, firewall, pc, switchDevice] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(firewall.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);

    const result = triggerArpSpoof(attacker.id, firewall.id, pc.id);

    expect(result).toEqual({ success: true, forwardBlocked: true, reverseBlocked: false });
    expect(useTopologyStore.getState().arpAttackLog[0].blocked).toBe(true);
  });

  it('bidirectional triggerArpSpoof against an immune victim blocks only the forward leg, poisoning the non-immune impersonated device on the reverse leg', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('firewall', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, firewall, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(firewall.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    const result = triggerArpSpoof(attacker.id, firewall.id, server.id, true);

    expect(result).toEqual({ success: true, forwardBlocked: true, reverseBlocked: false });

    const { arpTables } = useTopologyStore.getState();
    const baseline = buildArpTable(useTopologyStore.getState().devices, useTopologyStore.getState().links);
    expect(arpTables[firewall.id]).toEqual(baseline[firewall.id]);
    expect(arpTables[server.id][firewall.ip]).toBe(attacker.mac);
  });

  it('triggerDnsPoison against an immune victim returns blocked: true and writes no poison', () => {
    const { addDevice, addLink, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('firewall', 0, 0);

    const [attacker, firewall] = useTopologyStore.getState().devices;
    addLink(attacker.id, firewall.id);

    const dnsTablesBefore = useTopologyStore.getState().dnsTables;
    const result = triggerDnsPoison(attacker.id, firewall.id, `${attacker.name}.local`, attacker.ip);

    expect(result).toEqual({ success: true, blocked: true });
    expect(useTopologyStore.getState().dnsTables).toEqual(dnsTablesBefore);
  });

  it('rejects triggerArpSpoof when attacker, victim, and impersonated device are not all distinct', () => {
    const { addDevice, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);

    const [attacker, pc] = useTopologyStore.getState().devices;

    const result = triggerArpSpoof(attacker.id, pc.id, pc.id);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/must all be different/);
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(0);
  });

  it('rejects triggerArpSpoof when attacker and victim are separated by a router (no L2 adjacency), and mutates no ARP table', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('router', 0, 0);
    addDevice('router', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, router1, router2, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, router1.id);
    addLink(router1.id, router2.id);
    addLink(router2.id, pc.id);

    const arpTablesBefore = useTopologyStore.getState().arpTables;
    const result = triggerArpSpoof(attacker.id, pc.id, server.id);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/not on the same local network segment/);
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(0);
    expect(useTopologyStore.getState().arpTables).toEqual(arpTablesBefore);
  });

  it('writes the poisoned ARP entry when attacker is on the same segment as the victim via a switch (regression)', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    const result = triggerArpSpoof(attacker.id, pc.id, server.id);

    expect(result).toEqual({ success: true, forwardBlocked: false, reverseBlocked: false });
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(attacker.mac);
  });

  it('bidirectional trigger poisons both the victim and the impersonated device tables', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    const result = triggerArpSpoof(attacker.id, pc.id, server.id, true);

    expect(result).toEqual({ success: true, forwardBlocked: false, reverseBlocked: false });
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(attacker.mac);
    expect(useTopologyStore.getState().arpTables[server.id][pc.ip]).toBe(attacker.mac);
  });

  it('bidirectional trigger logs two separate arpAttackLog/SIEM entries (one per direction)', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id, true);

    const log = useTopologyStore.getState().arpAttackLog;
    expect(log).toHaveLength(2);
    expect(log[0].victimDeviceId).toBe(pc.id);
    expect(log[0].impersonatedDeviceId).toBe(server.id);
    expect(log[1].victimDeviceId).toBe(server.id);
    expect(log[1].impersonatedDeviceId).toBe(pc.id);
  });

  it('one-way trigger (bidirectional omitted) logs exactly one arpAttackLog entry and leaves the impersonated device untouched (no regression)', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);

    const state = useTopologyStore.getState();
    expect(state.arpAttackLog).toHaveLength(1);
    expect(state.arpTables[server.id]).toEqual(buildArpTable(state.devices, state.links)[server.id]);
  });

  it('bidirectional stop clears both directions back to their real MACs', () => {
    const { addDevice, addLink, triggerArpSpoof, stopArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id, true);
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(attacker.mac);
    expect(useTopologyStore.getState().arpTables[server.id][pc.ip]).toBe(attacker.mac);

    const result = stopArpSpoof(pc.id, server.id);

    expect(result).toEqual({ success: true });
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(server.mac);
    expect(useTopologyStore.getState().arpTables[server.id][pc.ip]).toBe(pc.mac);
  });

  it('rejects a bidirectional trigger when the attacker is adjacent to the victim but not to the impersonated device, writing no poison at all', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switch1, pc, switch2, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switch1.id);
    addLink(pc.id, switch1.id);
    addLink(server.id, switch2.id);

    const arpTablesBefore = useTopologyStore.getState().arpTables;
    const result = triggerArpSpoof(attacker.id, pc.id, server.id, true);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/not on the same local network segment/);
    expect(useTopologyStore.getState().arpTables).toEqual(arpTablesBefore);
  });

  it('succeeds when the attacker is wired directly to the victim with no intermediate device (regression)', () => {
    // A direct wire from the victim to the attacker (no switch in between) is
    // the simplest possible form of L2 adjacency and must pass. Victim is a
    // router (not a pc) so there's room for a second direct link to a
    // separate impersonated device without needing a switch — a pc's max of
    // 1 connection would leave no room for that third participant.
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('router', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, router, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, router.id);
    addLink(router.id, server.id);

    const result = triggerArpSpoof(attacker.id, router.id, server.id);

    expect(result).toEqual({ success: true, forwardBlocked: false, reverseBlocked: false });
    expect(useTopologyStore.getState().arpTables[router.id][server.ip]).toBe(attacker.mac);
  });

  it('stopArpSpoof restores the poisoned entry to the impersonated device\'s real MAC', () => {
    const { addDevice, addLink, triggerArpSpoof, stopArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(attacker.mac);

    const result = stopArpSpoof(pc.id, server.id);

    expect(result).toEqual({ success: true });
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(server.mac);
  });

  it('cleanly overwrites the poisoned entry when a second, different attacker re-triggers on an already-poisoned victim, and stop still targets it correctly (edge case)', () => {
    const { addDevice, addLink, triggerArpSpoof, stopArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker1, attacker2, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker1.id, switchDevice.id);
    addLink(attacker2.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker1.id, pc.id, server.id);
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(attacker1.mac);

    const secondResult = triggerArpSpoof(attacker2.id, pc.id, server.id);
    expect(secondResult).toEqual({ success: true, forwardBlocked: false, reverseBlocked: false });
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(attacker2.mac);

    const stopResult = stopArpSpoof(pc.id, server.id);

    expect(stopResult).toEqual({ success: true });
    expect(useTopologyStore.getState().arpTables[pc.id][server.ip]).toBe(server.mac);
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

  it('rejects triggerDnsPoison when attacker and victim are the same device', () => {
    const { addDevice, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    const [attacker] = useTopologyStore.getState().devices;

    const result = triggerDnsPoison(attacker.id, attacker.id, 'bank.com', '6.6.6.6');

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/must be different/);
    expect(useTopologyStore.getState().dnsAttackLog).toHaveLength(0);
  });

  it('rejects triggerDnsPoison when fakeIp does not match any device, writing no poison', () => {
    const { addDevice, addLink, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);

    const [attacker, pc] = useTopologyStore.getState().devices;
    addLink(attacker.id, pc.id);

    const dnsTablesBefore = useTopologyStore.getState().dnsTables;
    const result = triggerDnsPoison(attacker.id, pc.id, 'bank.local', '9.9.9.9');

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/does not match any device/);
    expect(useTopologyStore.getState().dnsTables).toEqual(dnsTablesBefore);
  });

  it('rejects triggerDnsPoison when fakeIp matches a device unreachable from the victim, writing no poison', () => {
    const { addDevice, addLink, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, pc.id);
    // server is left unlinked to anything, so it is unreachable from pc.

    const dnsTablesBefore = useTopologyStore.getState().dnsTables;
    const result = triggerDnsPoison(attacker.id, pc.id, 'bank.local', server.ip);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/no network path/);
    expect(useTopologyStore.getState().dnsTables).toEqual(dnsTablesBefore);
  });

  it('succeeds and writes the poisoned entry when fakeIp matches a reachable device, and a subsequent ping is redirected (regression)', () => {
    const { addDevice, addLink, triggerDnsPoison, pingDevice } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    const targetDomain = `${server.name}.local`;
    const result = triggerDnsPoison(attacker.id, pc.id, targetDomain, attacker.ip);

    expect(result).toEqual({ success: true, blocked: false });
    expect(useTopologyStore.getState().dnsTables[pc.id][targetDomain]).toBe(attacker.ip);

    const pingResult = pingDevice(pc.id, server.id);
    expect(pingResult.mitm).toBe(true);
  });

  it('stopDnsPoison removes the poisoned entry and a subsequent ping is no longer redirected (regression)', () => {
    const { addDevice, addLink, triggerDnsPoison, stopDnsPoison, pingDevice } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    const targetDomain = `${server.name}.local`;
    triggerDnsPoison(attacker.id, pc.id, targetDomain, attacker.ip);

    const poisonedPing = pingDevice(pc.id, server.id);
    expect(poisonedPing.mitm).toBe(true);

    const stopResult = stopDnsPoison(pc.id, targetDomain);

    expect(stopResult).toEqual({ success: true });
    expect(useTopologyStore.getState().dnsTables[pc.id][targetDomain]).toBeUndefined();

    const restoredPing = pingDevice(pc.id, server.id);
    expect(restoredPing.mitm).toBe(false);
    expect(restoredPing.path).toEqual([pc.id, switchDevice.id, server.id]);
  });

  it('combines ARP and DNS active poisonings across different device pairs (visual detection integration)', () => {
    const { addDevice, addLink, triggerArpSpoof, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);
    addDevice('router', 0, 0);

    const [attacker, switchDevice, pc, server, router] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);
    addLink(router.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);
    triggerDnsPoison(attacker.id, router.id, `${server.name}.local`, attacker.ip);

    const state = useTopologyStore.getState();
    const arpPoisonings = findActivePoisonings(state.devices, state.links, state.arpTables);
    const dnsPoisonings = findActiveDnsPoisonings(state.devices, state.dnsTables);

    expect(arpPoisonings).toHaveLength(1);
    expect(dnsPoisonings).toHaveLength(1);

    const poisonedVictimIds = new Set([
      ...arpPoisonings.map((p) => p.victimDeviceId),
      ...dnsPoisonings.map((p) => p.victimDeviceId),
    ]);
    expect(poisonedVictimIds).toEqual(new Set([pc.id, router.id]));
  });

  it('rejects triggerArpSpoof regardless of which of a multi-linked victim\'s links was created first (order-independence regression)', () => {
    // router1 has two links: to router2 (where attacker1 lives — NOT router1's
    // real local segment) and to switch1 (router1's actual segment, where
    // sharedPc lives). Previously, whichever link was created first decided
    // the outcome; the fix must reject in both orders, since attacker1 is
    // never really on router1's segment either way.
    const build = (createRouterLinkFirst) => {
      const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

      addDevice('router', 0, 0);
      addDevice('router', 0, 0);
      addDevice('attacker', 0, 0);
      addDevice('switch', 0, 0);
      addDevice('pc', 0, 0);

      const [router1, router2, attacker, switchDevice, sharedPc] = useTopologyStore.getState().devices;

      if (createRouterLinkFirst) {
        addLink(router1.id, router2.id);
        addLink(attacker.id, router2.id);
        addLink(router1.id, switchDevice.id);
        addLink(switchDevice.id, sharedPc.id);
      } else {
        addLink(router1.id, switchDevice.id);
        addLink(switchDevice.id, sharedPc.id);
        addLink(router1.id, router2.id);
        addLink(attacker.id, router2.id);
      }

      return triggerArpSpoof(attacker.id, router1.id, sharedPc.id);
    };

    const routerFirstResult = build(true);
    expect(routerFirstResult.success).toBe(false);
    expect(routerFirstResult.reason).toMatch(/not on the same local network segment/);

    useTopologyStore.getState().clearTopology();

    const switchFirstResult = build(false);
    expect(switchFirstResult.success).toBe(false);
    expect(switchFirstResult.reason).toMatch(/not on the same local network segment/);
  });

  it('rejects a one-way triggerArpSpoof when the impersonated device is not on the victim\'s real segment, writing no poison', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switch1, pc, switch2, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switch1.id);
    addLink(pc.id, switch1.id);
    addLink(server.id, switch2.id);

    const arpTablesBefore = useTopologyStore.getState().arpTables;
    const result = triggerArpSpoof(attacker.id, pc.id, server.id);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/not on the same local network segment/);
    expect(useTopologyStore.getState().arpTables).toEqual(arpTablesBefore);
  });

  it('stopArpSpoof after a one-way attack plants zero phantom keys in the impersonated device\'s own table', () => {
    const { addDevice, addLink, triggerArpSpoof, stopArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);
    stopArpSpoof(pc.id, server.id);

    const state = useTopologyStore.getState();
    const freshBaseline = buildArpTable(state.devices, state.links);
    expect(state.arpTables[server.id]).toEqual(freshBaseline[server.id]);
    expect(findActivePoisonings(state.devices, state.links, state.arpTables)).toEqual([]);
  });
});

describe('pingDevice', () => {
  it('succeeds and creates a moving packet when a direct link exists', () => {
    const { addDevice, addLink, pingDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [pc, router] = useTopologyStore.getState().devices;
    addLink(pc.id, router.id);

    const result = pingDevice(pc.id, router.id);

    expect(result).toMatchObject({ success: true, deviceId: router.id });
    expect(result.path).toEqual([pc.id, router.id]);
    expect(result.hops).toBe(1);
    expect(useTopologyStore.getState().activePackets).toHaveLength(1);
  });

  it('succeeds via a multi-hop path through a switch when there is no direct link', () => {
    const { addDevice, addLink, pingDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);

    const [pc1, switchDevice, pc2] = useTopologyStore.getState().devices;
    addLink(pc1.id, switchDevice.id);
    addLink(switchDevice.id, pc2.id);

    const result = pingDevice(pc1.id, pc2.id);

    expect(result).toMatchObject({ success: true, deviceId: pc2.id });
    expect(result.path).toEqual([pc1.id, switchDevice.id, pc2.id]);
    expect(result.hops).toBe(2);
    expect(useTopologyStore.getState().activePackets).toHaveLength(1);
  });

  it('reports per-segment link type/speed detail for a mixed path', () => {
    const { addDevice, addLink, setLinkSpeed, pingDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('router', 0, 0);
    addDevice('pc', 0, 0);

    const [pc1, switchDevice, router, pc2] = useTopologyStore.getState().devices;
    addLink(pc1.id, switchDevice.id, 'standard');
    addLink(switchDevice.id, router.id, 'backbone');
    addLink(router.id, pc2.id, 'standard');

    const [firstLink, backboneLink, lastLink] = useTopologyStore.getState().links;
    setLinkSpeed(firstLink.id, 100);
    setLinkSpeed(backboneLink.id, 10000);
    setLinkSpeed(lastLink.id, 100);

    const result = pingDevice(pc1.id, pc2.id);

    expect(result).toMatchObject({
      success: true,
      linkTypeSummary: 'mixed',
      linkDetail: 'Standard @100 Mbps → Backbone @10 Gbps → Standard @100 Mbps',
    });
  });

  it('fails without creating a packet when there is no path at all', () => {
    const { addDevice, pingDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [pc, router] = useTopologyStore.getState().devices;

    const result = pingDevice(pc.id, router.id);

    expect(result).toMatchObject({ success: false, deviceId: router.id, reason: 'no_path' });
    expect(useTopologyStore.getState().activePackets).toHaveLength(0);
  });

  it('fails when the only link on the path has been disabled', () => {
    const { addDevice, addLink, setLinkEnabled, pingDevice } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [pc, router] = useTopologyStore.getState().devices;
    addLink(pc.id, router.id);
    const [link] = useTopologyStore.getState().links;

    setLinkEnabled(link.id, false);

    const result = pingDevice(pc.id, router.id);

    expect(result).toMatchObject({ success: false, deviceId: router.id, reason: 'no_path' });
    expect(useTopologyStore.getState().activePackets).toHaveLength(0);
  });

  it('routes normally again (no MITM redirect) after stopArpSpoof reverses a previously active poison', () => {
    const { addDevice, addLink, triggerArpSpoof, stopArpSpoof, pingDevice } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);

    const poisonedPing = pingDevice(pc.id, server.id);
    expect(poisonedPing.mitm).toBe(true);

    stopArpSpoof(pc.id, server.id);

    const restoredPing = pingDevice(pc.id, server.id);
    expect(restoredPing.mitm).toBe(false);
    expect(restoredPing.path).toEqual([pc.id, switchDevice.id, server.id]);
  });

  it('disabling the only link to the real victim breaks a poisoned MITM path (no crash, no path), and re-enabling resumes MITM without re-triggering', () => {
    const { addDevice, addLink, setLinkEnabled, triggerArpSpoof, pingDevice } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);
    const serverLink = useTopologyStore
      .getState()
      .links.find((link) => link.sourceDeviceId === server.id || link.targetDeviceId === server.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);

    const poisonedPing = pingDevice(pc.id, server.id);
    expect(poisonedPing.mitm).toBe(true);

    setLinkEnabled(serverLink.id, false);

    const brokenPing = pingDevice(pc.id, server.id);
    expect(brokenPing).toMatchObject({ success: false, reason: 'no_path' });

    setLinkEnabled(serverLink.id, true);

    const resumedPing = pingDevice(pc.id, server.id);
    expect(resumedPing.mitm).toBe(true);
    expect(resumedPing.path).toEqual([pc.id, switchDevice.id, attacker.id, switchDevice.id, server.id]);
  });

  it('one-way ARP attack: ping shows forward leg redirected, reply leg direct (regression)', () => {
    const { addDevice, addLink, triggerArpSpoof, pingDevice } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);

    const result = pingDevice(pc.id, server.id);

    expect(result.mitm).toBe(true);
    expect(result.reverseMitm).toBe(false);

    const fullPath = useTopologyStore.getState().activePackets[0].path;
    const midpoint = Math.ceil(fullPath.length / 2);
    const forwardHalf = fullPath.slice(0, midpoint);
    const replyHalf = fullPath.slice(midpoint);

    expect(forwardHalf).toContain(attacker.id);
    expect(replyHalf).not.toContain(attacker.id);
  });

  it('bidirectional ARP attack: ping shows the attacker on both the forward and reply legs', () => {
    const { addDevice, addLink, triggerArpSpoof, pingDevice } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id, true);

    const result = pingDevice(pc.id, server.id);

    expect(result.mitm).toBe(true);
    expect(result.reverseMitm).toBe(true);

    const fullPath = useTopologyStore.getState().activePackets[0].path;
    const midpoint = Math.ceil(fullPath.length / 2);
    const forwardHalf = fullPath.slice(0, midpoint);
    const replyHalf = fullPath.slice(midpoint);

    expect(forwardHalf).toContain(attacker.id);
    expect(replyHalf).toContain(attacker.id);
  });
});

describe('setLinkEnabled', () => {
  it('updates only the enabled field on the matching link', () => {
    const { addDevice, addLink, setLinkEnabled } = useTopologyStore.getState();

    addDevice('router', 0, 0);
    addDevice('switch', 0, 0);

    const [router, switchDevice] = useTopologyStore.getState().devices;
    addLink(router.id, switchDevice.id, 'backbone');
    const [link] = useTopologyStore.getState().links;

    expect(link.enabled).toBe(true);

    setLinkEnabled(link.id, false);
    const updated = useTopologyStore.getState().links[0];

    expect(updated.enabled).toBe(false);
    expect(updated.type).toBe('backbone');
    expect(updated.sourceDeviceId).toBe(router.id);
    expect(updated.targetDeviceId).toBe(switchDevice.id);
  });
});

describe('addLink default speed', () => {
  it('defaults a standard link to the highest standard speed (1000 Mbps)', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('pc', 0, 0);

    const [pc1, pc2] = useTopologyStore.getState().devices;
    addLink(pc1.id, pc2.id);

    expect(useTopologyStore.getState().links[0].speed).toBe(1000);
  });

  it('defaults a backbone link to the highest backbone speed (40000 Mbps)', () => {
    const { addDevice, addLink } = useTopologyStore.getState();

    addDevice('router', 0, 0);
    addDevice('switch', 0, 0);

    const [router, switchDevice] = useTopologyStore.getState().devices;
    addLink(router.id, switchDevice.id, 'backbone');

    expect(useTopologyStore.getState().links[0].speed).toBe(40000);
  });
});

describe('setLinkSpeed', () => {
  it('updates only the speed field on the matching link', () => {
    const { addDevice, addLink, setLinkSpeed } = useTopologyStore.getState();

    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [pc, router] = useTopologyStore.getState().devices;
    addLink(pc.id, router.id);
    const [link] = useTopologyStore.getState().links;

    setLinkSpeed(link.id, 10);
    const updated = useTopologyStore.getState().links[0];

    expect(updated.speed).toBe(10);
    expect(updated.enabled).toBe(true);
    expect(updated.type).toBe('standard');
  });
});

describe('clearTopology', () => {
  it('empties devices, links, and all related state in one call', () => {
    const { addDevice, addLink, triggerArpSpoof, clearTopology } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('router', 0, 0);

    const [attacker, pc, router] = useTopologyStore.getState().devices;
    addLink(pc.id, router.id);
    triggerArpSpoof(attacker.id, pc.id, router.id);

    clearTopology();

    const state = useTopologyStore.getState();
    expect(state.devices).toEqual([]);
    expect(state.links).toEqual([]);
    expect(state.activePackets).toEqual([]);
    expect(state.arpTables).toEqual({});
    expect(state.dnsTables).toEqual({});
    expect(state.arpAttackLog).toEqual([]);
    expect(state.dnsAttackLog).toEqual([]);
    expect(state.connectingFromDeviceId).toBeNull();
    expect(state.deviceCounts).toEqual({});
  });

  it('resets deviceCounts so naming restarts at 1 after a clear, instead of continuing a stale counter', () => {
    const { addDevice, clearTopology } = useTopologyStore.getState();

    addDevice('router', 0, 0);
    addDevice('router', 0, 0);
    addDevice('pc', 0, 0);
    expect(useTopologyStore.getState().devices.map((d) => d.name)).toEqual(['router-1', 'router-2', 'pc-1']);

    clearTopology();
    addDevice('router', 0, 0);

    expect(useTopologyStore.getState().devices[0].name).toBe('router-1');
  });

  it('gracefully rejects (no crash) a triggerArpSpoof attempt using stale device ids left over from before a clear', () => {
    const { addDevice, addLink, triggerArpSpoof, clearTopology } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);
    expect(useTopologyStore.getState().arpAttackLog).toHaveLength(1);

    clearTopology();

    const staleResult = triggerArpSpoof(attacker.id, pc.id, server.id);

    expect(staleResult).toEqual({
      success: false,
      reason: 'Cannot trigger ARP spoof: one or more devices not found',
    });
    expect(useTopologyStore.getState().arpAttackLog).toEqual([]);
  });
});

describe('saveTopology / loadTopology', () => {
  it('deleteTopology calls DELETE on /network-topologies/{id}', async () => {
    const { deleteTopology } = useTopologyStore.getState();

    await deleteTopology('abc123');

    const call = fetch.mock.calls.find(([url]) => url.endsWith('/network-topologies/abc123'));
    expect(call).toBeDefined();
    expect(call[1].method).toBe('DELETE');
  });

  it('deleteTopology returns { success: true } when the request succeeds', async () => {
    const { deleteTopology } = useTopologyStore.getState();

    const result = await deleteTopology('abc123');

    expect(result).toEqual({ success: true });
  });

  it('deleteTopology returns a failure result (not a thrown exception) when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })));

    const { deleteTopology } = useTopologyStore.getState();
    const result = await deleteTopology('missing-id');

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/failed with status 404/);
  });

  it('saveTopology POSTs only structural topology data (devices/links), nothing else', async () => {
    const { addDevice, addLink, saveTopology } = useTopologyStore.getState();

    addDevice('router', 0, 0);
    addDevice('pc', 0, 0);
    const [router, pc] = useTopologyStore.getState().devices;
    addLink(router.id, pc.id);

    await saveTopology('My Topology');

    const call = fetch.mock.calls.find(([url]) => url.endsWith('/network-topologies'));
    expect(call).toBeDefined();
    const body = JSON.parse(call[1].body);

    expect(body).toEqual({
      name: 'My Topology',
      data: {
        devices: useTopologyStore.getState().devices,
        links: useTopologyStore.getState().links,
      },
    });
  });

  it('saveTopology returns a failure result (not a thrown exception) when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })));

    const { saveTopology } = useTopologyStore.getState();
    const result = await saveTopology('Broken Save');

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/failed with status 500/);
  });

  it('loadTopology round-trips devices/links exactly and rebuilds a fresh (unpoisoned) baseline', () => {
    const { addDevice, addLink, clearTopology, loadTopology } = useTopologyStore.getState();

    addDevice('router', 10, 20);
    addDevice('switch', 30, 40);
    addDevice('pc', 50, 60);
    const [router, switchDevice, pc] = useTopologyStore.getState().devices;
    addLink(router.id, switchDevice.id);
    addLink(switchDevice.id, pc.id);

    const savedDevices = useTopologyStore.getState().devices;
    const savedLinks = useTopologyStore.getState().links;

    clearTopology();
    expect(useTopologyStore.getState().devices).toEqual([]);

    loadTopology({ devices: savedDevices, links: savedLinks });

    const state = useTopologyStore.getState();
    expect(state.devices).toEqual(savedDevices);
    expect(state.links).toEqual(savedLinks);
    expect(state.arpTables).toEqual(buildArpTable(savedDevices, savedLinks));
    expect(state.dnsTables).toEqual(buildDnsTable(savedDevices));
    expect(state.arpAttackLog).toEqual([]);
    expect(state.dnsAttackLog).toEqual([]);
  });

  it('loadTopology avoids id/name collisions for devices added afterward', () => {
    const { addDevice, loadTopology } = useTopologyStore.getState();

    const loadedDevices = [
      { id: 'device-7', type: 'pc', name: 'pc-3', x: 0, y: 0, ip: '192.168.1.10', mac: '00:00:00:00:00:01' },
    ];
    loadTopology({ devices: loadedDevices, links: [] });

    addDevice('pc', 0, 0);

    const newDevice = useTopologyStore.getState().devices.find((d) => d.id !== 'device-7');
    expect(newDevice.id).not.toBe('device-7');
    expect(newDevice.name).toBe('pc-4');
  });

  it('regression: loadTopology backfills missing dosFloodTicks/isOverwhelmed/dosFloodActive on legacy saves, so DoS still works correctly on the very first trigger', () => {
    const { loadTopology, triggerDosAttack } = useTopologyStore.getState();

    // Shaped like a topology saved before these fields existed - no
    // isOverwhelmed/dosFloodTicks/dosFloodActive keys at all.
    const legacyDevices = [
      { id: 'device-1', type: 'attacker', x: 0, y: 0, name: 'attacker-1', mac: 'aa:aa:aa:aa:aa:aa', ip: '10.0.0.1' },
      { id: 'device-2', type: 'server', x: 0, y: 0, name: 'server-1', mac: 'bb:bb:bb:bb:bb:bb', ip: '10.0.0.2' },
    ];
    const legacyLinks = [
      { id: 'link-1', sourceDeviceId: 'device-1', targetDeviceId: 'device-2', type: 'standard', enabled: true, speed: 100 },
    ];

    loadTopology({ devices: legacyDevices, links: legacyLinks });

    const loaded = useTopologyStore.getState().devices.find((d) => d.id === 'device-2');
    expect(loaded).toMatchObject({ isOverwhelmed: false, dosFloodTicks: 0, dosFloodActive: false });

    vi.useFakeTimers();
    const result = triggerDosAttack('device-1', 'device-2');
    expect(result).toEqual({ success: true, blocked: false });

    const { registerDosPacketArrival } = useTopologyStore.getState();
    for (let i = 0; i < 12; i += 1) {
      registerDosPacketArrival('device-2');
    }

    const server = useTopologyStore.getState().devices.find((d) => d.id === 'device-2');
    expect(server.dosFloodTicks).toBe(12);
    expect(Number.isNaN(server.dosFloodTicks)).toBe(false);
    expect(server.isOverwhelmed).toBe(true);

    useTopologyStore.getState().stopDosAttack('device-2');
    vi.useRealTimers();
  });
});

describe('toasts', () => {
  it('pushToast adds a toast with a generated id and defaults to type success', () => {
    const { pushToast } = useTopologyStore.getState();

    pushToast('hello');

    const toasts = useTopologyStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: 'hello', type: 'success' });
    expect(toasts[0].id).toBeTruthy();
  });

  it('pushToast stores an explicit error type', () => {
    const { pushToast } = useTopologyStore.getState();

    pushToast('something failed', 'error');

    expect(useTopologyStore.getState().toasts[0]).toMatchObject({
      message: 'something failed',
      type: 'error',
    });
  });

  it('dismissToast removes only the matching toast', () => {
    const { pushToast, dismissToast } = useTopologyStore.getState();

    pushToast('first');
    pushToast('second');
    const [first, second] = useTopologyStore.getState().toasts;

    dismissToast(first.id);

    const remaining = useTopologyStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
  });
});

describe('postSecurityEvent device name snapshots', () => {
  function lastPostedEventBody() {
    const calls = fetch.mock.calls.filter(([url]) => url.endsWith('/security-events'));
    const [, options] = calls[calls.length - 1];
    return JSON.parse(options.body);
  }

  it('includes attacker/victim/impersonated device names on a one-way triggerArpSpoof', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id);

    const body = lastPostedEventBody();
    expect(body.attackerDeviceName).toBe(attacker.name);
    expect(body.victimDeviceName).toBe(pc.name);
    expect(body.impersonatedDeviceName).toBe(server.name);
  });

  it('swaps victim/impersonated names on the bidirectional reverse event, matching the id swap', () => {
    const { addDevice, addLink, triggerArpSpoof } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerArpSpoof(attacker.id, pc.id, server.id, true);

    const reverseCall = fetch.mock.calls.filter(([url]) => url.endsWith('/security-events'))[1];
    const body = JSON.parse(reverseCall[1].body);

    expect(body.attackerDeviceName).toBe(attacker.name);
    expect(body.victimDeviceName).toBe(server.name);
    expect(body.impersonatedDeviceName).toBe(pc.name);
    // id fields already swap the same way - names must match the same swap
    expect(body.victimDeviceId).toBe(server.id);
    expect(body.impersonatedDeviceId).toBe(pc.id);
  });

  it('includes attacker/victim device names on triggerDnsPoison', () => {
    const { addDevice, addLink, triggerDnsPoison } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('switch', 0, 0);
    addDevice('pc', 0, 0);
    addDevice('server', 0, 0);

    const [attacker, switchDevice, pc, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, switchDevice.id);
    addLink(pc.id, switchDevice.id);
    addLink(server.id, switchDevice.id);

    triggerDnsPoison(attacker.id, pc.id, `${server.name}.local`, attacker.ip);

    const body = lastPostedEventBody();
    expect(body.attackerDeviceName).toBe(attacker.name);
    expect(body.victimDeviceName).toBe(pc.name);
  });
});

describe('triggerDosAttack / stopDosAttack', () => {
  afterEach(() => {
    // Any attack left running by a test would otherwise keep firing its
    // setInterval loops against a topology the next test has already reset.
    const targetId = useTopologyStore.getState().devices.find((device) => device.isOverwhelmed)?.id;
    if (targetId) {
      useTopologyStore.getState().stopDosAttack(targetId);
    }
    vi.useRealTimers();
  });

  it('succeeds against a non-immune target: sets isOverwhelmed and starts a packet flood', () => {
    const { addDevice, addLink, triggerDosAttack } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('server', 0, 0);
    const [attacker, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, server.id);

    vi.useFakeTimers();
    const result = triggerDosAttack(attacker.id, server.id);

    expect(result).toEqual({ success: true, blocked: false });
    expect(useTopologyStore.getState().devices.find((d) => d.id === server.id).isOverwhelmed).toBe(false);
    expect(useTopologyStore.getState().activePackets).toHaveLength(0);

    vi.advanceTimersByTime(350);

    expect(useTopologyStore.getState().activePackets.length).toBeGreaterThan(0);

    const { registerDosPacketArrival } = useTopologyStore.getState();
    for (let i = 0; i < 12; i += 1) {
      registerDosPacketArrival(server.id);
    }

    expect(useTopologyStore.getState().devices.find((d) => d.id === server.id).isOverwhelmed).toBe(true);
  });

  it('is blocked against an immune (firewall) target: no isOverwhelmed, no flood, blocked event sent', () => {
    const { addDevice, addLink, triggerDosAttack } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('firewall', 0, 0);
    const [attacker, firewall] = useTopologyStore.getState().devices;
    addLink(attacker.id, firewall.id);

    vi.useFakeTimers();
    const result = triggerDosAttack(attacker.id, firewall.id);

    expect(result).toEqual({ success: true, blocked: true });
    expect(useTopologyStore.getState().devices.find((d) => d.id === firewall.id).isOverwhelmed).toBe(false);
    expect(useTopologyStore.getState().devices.find((d) => d.id === firewall.id).dosFloodActive).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(useTopologyStore.getState().activePackets).toHaveLength(0);

    const calls = fetch.mock.calls.filter(([url]) => url.endsWith('/security-events'));
    const [, options] = calls[calls.length - 1];
    expect(JSON.parse(options.body).eventType).toBe('firewall_blocked_dos');
  });

  it('stopDosAttack clears isOverwhelmed and stops further packets from being created', () => {
    const { addDevice, addLink, triggerDosAttack, stopDosAttack } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('server', 0, 0);
    const [attacker, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, server.id);

    vi.useFakeTimers();
    triggerDosAttack(attacker.id, server.id);

    const { registerDosPacketArrival } = useTopologyStore.getState();
    for (let i = 0; i < 12; i += 1) {
      registerDosPacketArrival(server.id);
    }

    expect(useTopologyStore.getState().devices.find((d) => d.id === server.id).isOverwhelmed).toBe(true);

    const stopResult = stopDosAttack(server.id);
    expect(stopResult).toEqual({ success: true });
    expect(useTopologyStore.getState().devices.find((d) => d.id === server.id).isOverwhelmed).toBe(false);

    const packetCountAfterStop = useTopologyStore.getState().activePackets.length;
    vi.advanceTimersByTime(2000);

    expect(useTopologyStore.getState().activePackets.length).toBe(packetCountAfterStop);
  });

  it('rejects a target that does not pass isValidDosTarget (e.g. a pc)', () => {
    const { addDevice, addLink, triggerDosAttack } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('pc', 0, 0);
    const [attacker, pc] = useTopologyStore.getState().devices;
    addLink(attacker.id, pc.id);

    const result = triggerDosAttack(attacker.id, pc.id);

    expect(result.success).toBe(false);
  });

  it('regression: dosFloodTicks/isOverwhelmed only advance on actual packet arrival, not on the send interval alone', () => {
    const { addDevice, addLink, triggerDosAttack, registerDosPacketArrival } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('server', 0, 0);
    const [attacker, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, server.id);

    vi.useFakeTimers();
    triggerDosAttack(attacker.id, server.id);

    const getServer = () => useTopologyStore.getState().devices.find((d) => d.id === server.id);

    // Advancing the send-interval alone (no simulated arrivals) must never
    // move dosFloodTicks - packets are launched here, not delivered.
    vi.advanceTimersByTime(350 * 20);
    expect(getServer().dosFloodTicks).toBe(0);
    expect(getServer().isOverwhelmed).toBe(false);

    // 11 arrivals: still below the 12-tick threshold.
    for (let i = 0; i < 11; i += 1) {
      registerDosPacketArrival(server.id);
    }
    expect(getServer().dosFloodTicks).toBe(11);
    expect(getServer().isOverwhelmed).toBe(false);

    // The 12th arrival crosses it.
    registerDosPacketArrival(server.id);
    expect(getServer().dosFloodTicks).toBe(12);
    expect(getServer().isOverwhelmed).toBe(true);
  });

  it('regression: registerDosPacketArrival is a no-op once the attack has been stopped (in-flight packets arriving after Stop)', () => {
    const { addDevice, addLink, triggerDosAttack, stopDosAttack, registerDosPacketArrival } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('server', 0, 0);
    const [attacker, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, server.id);

    vi.useFakeTimers();
    triggerDosAttack(attacker.id, server.id);

    const getServer = () => useTopologyStore.getState().devices.find((d) => d.id === server.id);

    registerDosPacketArrival(server.id);
    registerDosPacketArrival(server.id);
    expect(getServer().dosFloodTicks).toBe(2);

    stopDosAttack(server.id);
    expect(getServer().dosFloodTicks).toBe(0);
    expect(getServer().dosFloodActive).toBe(false);

    // Simulate an already-in-flight packet landing after Stop was clicked.
    registerDosPacketArrival(server.id);

    expect(getServer().dosFloodTicks).toBe(0);
    expect(getServer().isOverwhelmed).toBe(false);
  });

  it('regression: dosFloodActive (the panel\'s ACTIVE indicator) is true immediately on trigger, decoupled from isOverwhelmed', () => {
    const { addDevice, addLink, triggerDosAttack, stopDosAttack } = useTopologyStore.getState();

    addDevice('attacker', 0, 0);
    addDevice('server', 0, 0);
    const [attacker, server] = useTopologyStore.getState().devices;
    addLink(attacker.id, server.id);

    vi.useFakeTimers();
    const result = triggerDosAttack(attacker.id, server.id);

    expect(result).toEqual({ success: true, blocked: false });

    const getServer = () => useTopologyStore.getState().devices.find((d) => d.id === server.id);

    expect(getServer().dosFloodActive).toBe(true);
    expect(getServer().isOverwhelmed).toBe(false);

    const stopResult = stopDosAttack(server.id);

    expect(stopResult).toEqual({ success: true });
    expect(getServer().dosFloodActive).toBe(false);
  });
});
