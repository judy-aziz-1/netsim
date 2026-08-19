import { describe, expect, it } from 'vitest';
import {
  findPath,
  findMitmRedirect,
  buildPingRoute,
  calculatePingLatencyMs,
  describeLinkTypes,
  describeLinkDetail,
  isAttackerOnSameSegment,
  isDeviceOnRealSegment,
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
    // between), that is the simplest possible form of L2 adjacency and must
    // pass, not fail for lack of a (nonsensical) self-referencing link.
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

describe('isDeviceOnRealSegment', () => {
  it('returns true for the same device (self case)', () => {
    expect(isDeviceOnRealSegment('router1', 'router1', [], [])).toBe(true);
  });

  it('finds same-segment membership via a switch chain', () => {
    const devices = [device('pc1', 'pc'), device('switch1', 'switch'), device('attacker1', 'attacker')];
    const links = [link('l1', 'pc1', 'switch1'), link('l2', 'switch1', 'attacker1')];

    expect(isDeviceOnRealSegment('attacker1', 'pc1', devices, links)).toBe(true);
  });

  it('finds same-segment membership via a bare direct link with no switch', () => {
    const devices = [device('router1', 'router'), device('attacker1', 'attacker')];
    const links = [link('l1', 'router1', 'attacker1')];

    expect(isDeviceOnRealSegment('attacker1', 'router1', devices, links)).toBe(true);
  });

  it('returns false across a router hop (no shared segment)', () => {
    const devices = [device('pc1', 'pc'), device('router1', 'router'), device('router2', 'router'), device('pc2', 'pc')];
    const links = [link('l1', 'pc1', 'router1'), link('l2', 'router1', 'router2'), link('l3', 'router2', 'pc2')];

    expect(isDeviceOnRealSegment('pc2', 'pc1', devices, links)).toBe(false);
  });

  it('is independent of which of a multi-linked device\'s links was created first', () => {
    // router1 has two links: one to switch1 (its real local segment, where
    // sharedDevice lives) and one to router2 (a different segment, where
    // attacker1 lives). The correct answer — attacker1 is NOT on router1's
    // real segment — must hold no matter which link was added first.
    const devices = [
      device('router1', 'router'),
      device('router2', 'router'),
      device('attacker1', 'attacker'),
      device('switch1', 'switch'),
      device('sharedDevice', 'pc'),
    ];

    const switchFirstLinks = [
      link('l1', 'router1', 'switch1'),
      link('l2', 'switch1', 'sharedDevice'),
      link('l3', 'router1', 'router2'),
      link('l4', 'attacker1', 'router2'),
    ];
    const routerFirstLinks = [
      link('l1', 'router1', 'router2'),
      link('l2', 'attacker1', 'router2'),
      link('l3', 'router1', 'switch1'),
      link('l4', 'switch1', 'sharedDevice'),
    ];

    for (const links of [switchFirstLinks, routerFirstLinks]) {
      expect(isDeviceOnRealSegment('attacker1', 'router1', devices, links)).toBe(false);
      expect(isDeviceOnRealSegment('sharedDevice', 'router1', devices, links)).toBe(true);
    }
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

  it('fails with target_overwhelmed when the target device is being DoS-attacked', () => {
    const devices = [
      device('pc1', 'pc'),
      { ...device('server1', 'server'), isOverwhelmed: true },
    ];
    const links = [link('l1', 'pc1', 'server1')];

    const route = buildPingRoute('pc1', 'server1', devices, links, {}, {});

    expect(route).toEqual({
      success: false,
      reason: 'target_overwhelmed',
      message: 'Ping failed - target is overwhelmed by a denial-of-service attack',
    });
  });

  it('succeeds normally once the target is no longer overwhelmed', () => {
    const devices = [
      device('pc1', 'pc'),
      { ...device('server1', 'server'), isOverwhelmed: false },
    ];
    const links = [link('l1', 'pc1', 'server1')];
    const arpTables = buildArpTable(devices, links);
    const dnsTables = buildDnsTable(devices);

    const route = buildPingRoute('pc1', 'server1', devices, links, arpTables, dnsTables);

    expect(route.success).toBe(true);
  });

  it('one-way ARP attack: reply leg goes direct, not through the attacker (regression)', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'switch1', 'attacker1'),
    ];
    // One-way: attacker1 poisons pc1's (victim) table only, impersonating router1.
    const arpTables = simulateArpSpoof(buildArpTable(devices, links), 'attacker1', 'pc1', 'router1');
    const dnsTables = buildDnsTable(devices);

    const route = buildPingRoute('pc1', 'router1', devices, links, arpTables, dnsTables);

    expect(route.mitm).toBe(true);
    expect(route.path).toContain('attacker1');

    expect(route.reverseMitm).toBe(false);
    expect(route.reversePath).not.toContain('attacker1');
    expect(route.reversePath).toEqual(findPath(devices, links, 'router1', 'pc1'));
  });

  it('bidirectional ARP attack: both legs redirect through the attacker', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'switch1', 'attacker1'),
    ];
    let arpTables = simulateArpSpoof(buildArpTable(devices, links), 'attacker1', 'pc1', 'router1');
    arpTables = simulateArpSpoof(arpTables, 'attacker1', 'router1', 'pc1');
    const dnsTables = buildDnsTable(devices);

    const route = buildPingRoute('pc1', 'router1', devices, links, arpTables, dnsTables);

    expect(route.mitm).toBe(true);
    expect(route.path).toContain('attacker1');
    expect(route.reverseMitm).toBe(true);
    expect(route.reversePath).toContain('attacker1');
  });

  it('impersonated-initiated ping under a one-way attack still shows no MITM on the forward leg (regression)', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'switch1', 'attacker1'),
    ];
    const arpTables = simulateArpSpoof(buildArpTable(devices, links), 'attacker1', 'pc1', 'router1');
    const dnsTables = buildDnsTable(devices);

    // Ping initiated FROM the impersonated device (router1) TO the victim (pc1).
    const route = buildPingRoute('router1', 'pc1', devices, links, arpTables, dnsTables);

    expect(route.mitm).toBe(false);
    // Not a bug: the "reverse" of *this* call is pc1->router1, and pc1's table
    // genuinely is poisoned in one-way mode, so this is correct new information,
    // not a regression.
    expect(route.reverseMitm).toBe(true);
  });

  it('DNS poisoning: reply leg always goes direct (no bidirectional concept for DNS)', () => {
    const devices = [
      device('pc1', 'pc'),
      device('switch1', 'switch'),
      device('router1', 'router'),
      device('attacker1', 'attacker'),
    ];
    const links = [
      link('l1', 'pc1', 'switch1'),
      link('l2', 'switch1', 'router1'),
      link('l3', 'switch1', 'attacker1'),
    ];
    const arpTables = buildArpTable(devices, links);
    const dnsTables = simulateDnsPoison(
      buildDnsTable(devices),
      'attacker1',
      'pc1',
      `${devices[2].name}.local`,
      devices[3].ip,
    );

    const route = buildPingRoute('pc1', 'router1', devices, links, arpTables, dnsTables);

    expect(route.mitm).toBe(true);
    expect(route.via).toBe('dns');
    expect(route.reverseMitm).toBe(false);
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
