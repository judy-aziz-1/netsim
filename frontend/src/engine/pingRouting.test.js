import { describe, expect, it } from 'vitest';
import {
  findPath,
  findMitmRedirect,
  buildPingRoute,
  calculatePingLatencyMs,
  describeLinkTypes,
  describeLinkDetail,
  isAttackerOnSameSegment,
} from './pingRouting';
import { buildArpTable, simulateArpSpoof } from './arpSpoofing';
import { buildDnsTable, simulateDnsPoison } from './dnsPoisoning';

function device(id, type, overrides = {}) {
  const defaultIp = type === 'switch' ? undefined : `10.0.0.${id.length}`;

  return {
    id,
    type,
    name: overrides.name ?? id,
    x: 0,
    y: 0,
    ip: 'ip' in overrides ? overrides.ip : defaultIp,
    mac: overrides.mac ?? `00:00:00:00:00:${id.length.toString(16).padStart(2, '0')}`,
  };
}

function link(id, sourceDeviceId, targetDeviceId, type = 'standard', speed) {
  return { id, sourceDeviceId, targetDeviceId, type, ...(speed !== undefined ? { speed } : {}) };
}

describe('findPath', () => {
  it('finds a direct path when devices are directly linked', () => {
    const devices = [device('pc1', 'pc'), device('router1', 'router')];
    const links = [link('l1', 'pc1', 'router1')];

    expect(findPath(devices, links, 'pc1', 'router1')).toEqual(['pc1', 'router1']);
  });

  it('finds a multi-hop path through router/switch intermediaries', () => {
    const devices = [
      device('pc1', 'pc'),
      device('sw1', 'switch'),
      device('router1', 'router'),
      device('pc2', 'pc'),
    ];
    const links = [
      link('l1', 'pc1', 'sw1'),
      link('l2', 'sw1', 'router1'),
      link('l3', 'router1', 'pc2'),
    ];

    expect(findPath(devices, links, 'pc1', 'pc2')).toEqual(['pc1', 'sw1', 'router1', 'pc2']);
  });

  it('refuses to route through a PC/server/attacker as an intermediate node', () => {
    const devices = [device('pc1', 'pc'), device('pc2', 'pc'), device('pc3', 'pc')];
    const links = [link('l1', 'pc1', 'pc2'), link('l2', 'pc2', 'pc3')];

    expect(findPath(devices, links, 'pc1', 'pc3')).toBeNull();
  });

  it('returns null when there is no path at all', () => {
    const devices = [device('pc1', 'pc'), device('pc2', 'pc')];
    const links = [];

    expect(findPath(devices, links, 'pc1', 'pc2')).toBeNull();
  });
});

describe('isAttackerOnSameSegment', () => {
  it('treats a direct wire from the reference device to the attacker itself as adjacent', () => {
    // When the victim's only/immediate neighbor IS the attacker (no switch in
    // between), getImmediateNeighborId(victim, links) resolves to the attacker's
    // own id. That is the simplest possible form of L2 adjacency and must pass,
    // not fail for lack of a (nonsensical) self-referencing link.
    expect(isAttackerOnSameSegment('attacker1', 'attacker1', [])).toBe(true);
  });

  it('still requires an actual link when attacker and reference device differ', () => {
    const links = [link('l1', 'switch1', 'router1')];

    expect(isAttackerOnSameSegment('attacker1', 'switch1', links)).toBe(false);
  });

  it('finds adjacency via a real link between the attacker and the reference device', () => {
    const links = [link('l1', 'switch1', 'attacker1')];

    expect(isAttackerOnSameSegment('attacker1', 'switch1', links)).toBe(true);
  });
});

describe('findMitmRedirect', () => {
  it('reports no MITM when tables are unpoisoned', () => {
    const devices = [device('pc1', 'pc'), device('router1', 'router'), device('pc2', 'pc')];
    const links = [link('l1', 'pc1', 'router1'), link('l2', 'router1', 'pc2')];
    const arpTables = buildArpTable(devices, links);
    const dnsTables = buildDnsTable(devices);

    expect(findMitmRedirect('pc1', 'pc2', devices, links, arpTables, dnsTables)).toEqual({ mitm: false });
  });

  it('detects an ARP-based MITM redirect when the attacker impersonates the real next hop (shares its segment)', () => {
    // pc1 -- switch1 -- router1 -- pc2, with attacker1 also on switch1 (same broadcast
    // segment as pc1). switch1 has no IP (switches are transparent at L2), so the
    // attacker impersonates router1 — the real gateway/IP-resolution target beyond
    // the switch — which is exactly the classic ARP-spoofing scenario. A PC can only
    // ever hold one link (max connections = 1), so the attacker cannot be wired
    // directly into pc1 itself; it only needs to share pc1's segment (switch1).
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('pc2', 'pc'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'router1', 'pc2'),
      link('l4', 'switch1', 'attacker1'),
    ];
    const arpTables = simulateArpSpoof(buildArpTable(devices, links), 'attacker1', 'pc1', 'router1');
    const dnsTables = buildDnsTable(devices);

    const result = findMitmRedirect('pc1', 'pc2', devices, links, arpTables, dnsTables);

    expect(result).toEqual({ mitm: true, via: 'arp', attackerDeviceId: 'attacker1' });
  });

  it('ignores ARP poisoning attributed to a device not on the same segment as the impersonated hop', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('pc2', 'pc'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'router1', 'pc2'),
    ];
    const arpTables = simulateArpSpoof(buildArpTable(devices, links), 'attacker1', 'pc1', 'router1');
    const dnsTables = buildDnsTable(devices);

    expect(findMitmRedirect('pc1', 'pc2', devices, links, arpTables, dnsTables)).toEqual({ mitm: false });
  });

  it('detects a DNS-based MITM redirect when the fake IP matches a real device', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('pc2', 'pc', { ip: '10.0.0.99' }),
      device('attacker1', 'attacker', { ip: '10.0.0.66' }),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'router1', 'pc2'),
      link('l4', 'switch1', 'attacker1'),
    ];
    const dnsTables = simulateDnsPoison(buildDnsTable(devices), 'attacker1', 'pc1', `${devices[3].name}.local`, '10.0.0.66');
    const arpTables = buildArpTable(devices, links);

    const result = findMitmRedirect('pc1', 'pc2', devices, links, arpTables, dnsTables);

    expect(result).toEqual({ mitm: true, via: 'dns', attackerDeviceId: 'attacker1' });
  });

  it('does not activate MITM when the fake IP does not match any real device', () => {
    const devices = [device('pc1', 'pc'), device('switch1', 'switch'), device('router1', 'router'), device('pc2', 'pc')];
    const links = [link('l1', 'pc1', 'switch1'), link('l2', 'switch1', 'router1'), link('l3', 'router1', 'pc2')];
    const dnsTables = simulateDnsPoison(buildDnsTable(devices), 'router1', 'pc1', `${devices[3].name}.local`, '9.9.9.9');
    const arpTables = buildArpTable(devices, links);

    expect(findMitmRedirect('pc1', 'pc2', devices, links, arpTables, dnsTables)).toEqual({ mitm: false });
  });
});

describe('buildPingRoute', () => {
  it('routes the compromised ping through the attacker and onward to the real target', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('pc2', 'pc'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'router1', 'pc2'),
      link('l4', 'switch1', 'attacker1'),
    ];
    const arpTables = simulateArpSpoof(buildArpTable(devices, links), 'attacker1', 'pc1', 'router1');
    const dnsTables = buildDnsTable(devices);

    const route = buildPingRoute('pc1', 'pc2', devices, links, arpTables, dnsTables);

    expect(route.success).toBe(true);
    expect(route.mitm).toBe(true);
    expect(route.path[0]).toBe('pc1');
    expect(route.path).toContain('attacker1');
    expect(route.path[route.path.length - 1]).toBe('pc2');
  });

  it('fails with a clear reason when no path exists', () => {
    const devices = [device('pc1', 'pc'), device('pc2', 'pc')];
    const links = [];

    const route = buildPingRoute('pc1', 'pc2', devices, links, {}, {});

    expect(route).toEqual({
      success: false,
      reason: 'no_path',
      message: 'No path found - devices not connected',
    });
  });
});

describe('calculatePingLatencyMs', () => {
  it('adds 3-8ms per standard hop', () => {
    const path = ['a', 'b'];
    const links = [link('l1', 'a', 'b', 'standard')];

    for (let i = 0; i < 20; i += 1) {
      const latency = calculatePingLatencyMs(path, links);
      expect(latency).toBeGreaterThanOrEqual(3);
      expect(latency).toBeLessThanOrEqual(8);
    }
  });

  it('adds ~0.3-0.8ms per backbone hop at its 1000Mbps floor speed', () => {
    // Updated per the speed/latency integration: a backbone link now derives
    // its latency from `speed` (Mbps) via a continuous inverse formula
    // instead of a fixed 1-3ms bucket. At speed=1000 (the lowest backbone
    // tier), REFERENCE_LATENCY_MS * (REFERENCE_SPEED_MBPS / speed) * jitter
    // = 5.5 * 0.1 * [0.55, 1.45) = [0.3025, 0.7975)ms.
    const path = ['a', 'b'];
    const links = [link('l1', 'a', 'b', 'backbone', 1000)];

    for (let i = 0; i < 20; i += 1) {
      const latency = calculatePingLatencyMs(path, links);
      expect(latency).toBeGreaterThanOrEqual(0.3);
      expect(latency).toBeLessThanOrEqual(0.8);
    }
  });

  it('produces lower latency at higher speed for the same hop (deterministic — ranges never overlap)', () => {
    const path = ['a', 'b'];
    const slowLinks = [link('l1', 'a', 'b', 'standard', 10)];
    const fastLinks = [link('l1', 'a', 'b', 'standard', 1000)];

    const slowLatency = calculatePingLatencyMs(path, slowLinks);
    const fastLatency = calculatePingLatencyMs(path, fastLinks);

    expect(slowLatency).toBeGreaterThan(fastLatency);
  });

  it('produces the same latency range for standard and backbone links at the same speed (speed drives latency, not type)', () => {
    const path = ['a', 'b'];
    const standardLinks = [link('l1', 'a', 'b', 'standard', 1000)];
    const backboneLinks = [link('l1', 'a', 'b', 'backbone', 1000)];

    for (let i = 0; i < 20; i += 1) {
      expect(calculatePingLatencyMs(path, standardLinks)).toBeGreaterThanOrEqual(0.3);
      expect(calculatePingLatencyMs(path, standardLinks)).toBeLessThanOrEqual(0.8);
      expect(calculatePingLatencyMs(path, backboneLinks)).toBeGreaterThanOrEqual(0.3);
      expect(calculatePingLatencyMs(path, backboneLinks)).toBeLessThanOrEqual(0.8);
    }
  });
});

describe('describeLinkTypes', () => {
  it('returns standard when every hop is a standard link', () => {
    const path = ['a', 'b', 'c'];
    const links = [link('l1', 'a', 'b', 'standard'), link('l2', 'b', 'c', 'standard')];

    expect(describeLinkTypes(path, links)).toBe('standard');
  });

  it('returns backbone when every hop is a backbone link', () => {
    const path = ['a', 'b', 'c'];
    const links = [link('l1', 'a', 'b', 'backbone'), link('l2', 'b', 'c', 'backbone')];

    expect(describeLinkTypes(path, links)).toBe('backbone');
  });

  it('returns mixed when hops use different link types', () => {
    const path = ['a', 'b', 'c'];
    const links = [link('l1', 'a', 'b', 'standard'), link('l2', 'b', 'c', 'backbone')];

    expect(describeLinkTypes(path, links)).toBe('mixed');
  });
});

describe('describeLinkDetail', () => {
  it('describes a uniform backbone path with its speed', () => {
    const path = ['a', 'b', 'c'];
    const links = [link('l1', 'a', 'b', 'backbone', 10000), link('l2', 'b', 'c', 'backbone', 10000)];

    expect(describeLinkDetail(path, links)).toBe('Backbone @10 Gbps');
  });

  it('describes a uniform standard path with its speed', () => {
    const path = ['a', 'b', 'c'];
    const links = [link('l1', 'a', 'b', 'standard', 100), link('l2', 'b', 'c', 'standard', 100)];

    expect(describeLinkDetail(path, links)).toBe('Standard @100 Mbps');
  });

  it('describes a mixed path with per-segment speed detail', () => {
    const path = ['a', 'b', 'c'];
    const links = [link('l1', 'a', 'b', 'backbone', 10000), link('l2', 'b', 'c', 'standard', 100)];

    expect(describeLinkDetail(path, links)).toBe('Backbone @10 Gbps → Standard @100 Mbps');
  });
});
