import { describe, expect, it } from 'vitest';
import { computeSiemOverview } from './siemStats';

function event(eventType, attackerDeviceId, victimDeviceId, created_at) {
  return { eventType, attackerDeviceId, victimDeviceId, created_at };
}

describe('computeSiemOverview', () => {
  it('returns safe zero-valued output for empty events and alerts', () => {
    const overview = computeSiemOverview([], []);

    expect(overview.totalEvents).toBe(0);
    expect(overview.timelineBars).toEqual([]);
    expect(overview.donutSegments).toEqual([]);
    expect(overview.legend).toEqual([]);
    expect(overview.topAttackers).toEqual([]);
    expect(overview.topVictims).toEqual([]);
    expect(overview.statCards.find((c) => c.label === 'ACTIVE THREATS').value).toBe(0);
    expect(overview.statCards.find((c) => c.label === 'BLOCKED / ATTACKS').value).toBe('0 / 0');
    expect(overview.statCards.find((c) => c.label === 'BLOCKED / ATTACKS').sub).toBe('of 0 total events');
  });

  it('computes the blocked/attacks/total math for the fourth stat card', () => {
    const events = [
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:00.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:05.000Z'),
      event('dns_poison', 'a', 'v', '2026-08-10T10:00:10.000Z'),
      event('firewall_blocked_arp_spoof', 'a', 'v', '2026-08-10T10:00:15.000Z'),
      event('firewall_blocked_dns_spoof', 'a', 'v', '2026-08-10T10:00:20.000Z'),
    ];

    const overview = computeSiemOverview(events, []);
    const card = overview.statCards.find((c) => c.label === 'BLOCKED / ATTACKS');

    // blocked = 1 arp-blocked + 1 dns-blocked = 2; attacks = total(5) - blocked(2) = 3
    expect(card.value).toBe('2 / 3');
    expect(card.sub).toBe('of 5 total events');
    expect(overview.totalEvents).toBe(5);
  });

  it('computes ARP/DNS event card totals and sub-text', () => {
    const events = [
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:00.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:05.000Z'),
      event('firewall_blocked_arp_spoof', 'a', 'v', '2026-08-10T10:00:10.000Z'),
      event('dns_poison', 'a', 'v', '2026-08-10T10:00:15.000Z'),
    ];

    const overview = computeSiemOverview(events, []);
    const arpCard = overview.statCards.find((c) => c.label === 'ARP EVENTS');
    const dnsCard = overview.statCards.find((c) => c.label === 'DNS EVENTS');

    expect(arpCard.value).toBe(3);
    expect(arpCard.sub).toBe('2 attacks · 1 blocked');
    expect(dnsCard.value).toBe(1);
    expect(dnsCard.sub).toBe('1 attacks · 0 blocked');
  });

  it('counts only open alerts as active threats', () => {
    const alerts = [
      { status: 'open' },
      { status: 'open' },
      { status: 'resolved' },
    ];

    const overview = computeSiemOverview([], alerts);

    expect(overview.statCards.find((c) => c.label === 'ACTIVE THREATS').value).toBe(2);
  });

  it('builds donut segments and legend only for event types actually present, in fixed order', () => {
    const events = [
      event('dns_poison', 'a', 'v', '2026-08-10T10:00:00.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:05.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:10.000Z'),
    ];

    const overview = computeSiemOverview(events, []);

    expect(overview.legend.map((l) => l.label)).toEqual(['ARP Spoofing', 'DNS Poisoning']);
    expect(overview.legend.map((l) => l.count)).toEqual([2, 1]);
    expect(overview.donutSegments).toHaveLength(2);

    // first segment (arp, 2/3 of circle) starts at offset 0
    expect(overview.donutSegments[0].offset).toBe(-0);
    // second segment (dns, 1/3) starts where the first left off
    const circumference = 2 * Math.PI * 55;
    const firstDashLen = (2 / 3) * circumference;
    expect(overview.donutSegments[1].offset).toBeCloseTo(-firstDashLen, 5);
  });

  it('buckets events into 60-second windows spanning the full min-to-max range, filling gaps', () => {
    const events = [
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:10.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:30.000Z'),
      // gap at 10:01
      event('dns_poison', 'a', 'v', '2026-08-10T10:02:05.000Z'),
    ];

    const overview = computeSiemOverview(events, []);

    expect(overview.timelineBars).toHaveLength(3);
    expect(overview.timelineBars.map((b) => b.count)).toEqual([2, 0, 1]);
    expect(overview.timelineBars.map((b) => b.time)).toEqual(['10:00', '10:01', '10:02']);
    expect(overview.timelineBars[0].isBurst).toBe(false);
  });

  it('marks a bucket as a burst when it reaches the 3-event correlation threshold', () => {
    const events = [
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:00.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:15.000Z'),
      event('arp_spoof', 'a', 'v', '2026-08-10T10:00:30.000Z'),
    ];

    const overview = computeSiemOverview(events, []);

    expect(overview.timelineBars).toHaveLength(1);
    expect(overview.timelineBars[0].count).toBe(3);
    expect(overview.timelineBars[0].isBurst).toBe(true);
  });

  it('ranks top attackers/victims descending, breaking ties by first-seen insertion order, capped at 4', () => {
    const events = [
      event('arp_spoof', 'attacker-a', 'victim-x', '2026-08-10T10:00:00.000Z'),
      event('arp_spoof', 'attacker-a', 'victim-x', '2026-08-10T10:00:01.000Z'),
      event('arp_spoof', 'attacker-a', 'victim-y', '2026-08-10T10:00:02.000Z'),
      event('dns_poison', 'attacker-b', 'victim-y', '2026-08-10T10:00:03.000Z'),
      event('dns_poison', 'attacker-c', 'victim-z', '2026-08-10T10:00:04.000Z'),
      event('dns_poison', 'attacker-d', 'victim-w', '2026-08-10T10:00:05.000Z'),
      event('dns_poison', 'attacker-e', 'victim-q', '2026-08-10T10:00:06.000Z'),
    ];

    const overview = computeSiemOverview(events, []);

    expect(overview.topAttackers).toHaveLength(4);
    expect(overview.topAttackers[0]).toEqual({ id: 'attacker-a', name: 'attacker-a', count: 3, pct: 100 });
    expect(overview.topVictims[0]).toEqual({ id: 'victim-x', name: 'victim-x', count: 2, pct: 100 });
    expect(overview.topVictims.find((v) => v.name === 'victim-y').count).toBe(2);
  });

  it('keeps the timeline bounded and windowed to recent activity even when events span 30+ days, while full-history totals stay unaffected', () => {
    // 33 events spaced 25h apart (strictly more than the 24h window), spanning
    // ~34 days — mirrors the real dev-database scenario that caused the original
    // freeze (101 events spanning 32.8 days -> ~47,264 one-minute buckets).
    const events = [];
    const start = new Date('2026-07-08T10:00:00.000Z').getTime();
    for (let i = 0; i < 33; i += 1) {
      events.push(event('arp_spoof', 'a', 'v', new Date(start + i * 25 * 60 * 60 * 1000).toISOString()));
    }

    const overview = computeSiemOverview(events, []);

    // bounded regardless of span - this is the regression guard for the freeze
    expect(overview.timelineBars.length).toBeLessThanOrEqual(200);

    // full-history aggregates (unlike the timeline) are NOT windowed
    expect(overview.totalEvents).toBe(33);

    // only the single latest event (the other 32 are >24h before it) falls inside
    // the windowed timeline - proves older events are excluded, not just capped
    const totalBucketedCount = overview.timelineBars.reduce((sum, bar) => sum + bar.count, 0);
    expect(totalBucketedCount).toBe(1);
  });

  it('resolves to 1-minute buckets for a small recent span, and escalates bucket width for a full 24h span without exceeding the bucket cap', () => {
    const latest = new Date('2026-08-10T12:00:45.000Z').getTime();

    // 3 events within the same 60-second bucket (12:00:35-12:00:45, same UTC
    // minute) - burst well inside the recent window
    const denseEvents = [
      event('arp_spoof', 'a', 'v', new Date(latest - 10000).toISOString()),
      event('arp_spoof', 'a', 'v', new Date(latest - 5000).toISOString()),
      event('arp_spoof', 'a', 'v', new Date(latest).toISOString()),
    ];
    const denseOverview = computeSiemOverview(denseEvents, []);

    expect(denseOverview.timelineBucketMinutes).toBe(1);
    expect(denseOverview.timelineBars.some((b) => b.isBurst)).toBe(true);

    // events spread evenly across a full 24h window - 1,440 one-minute buckets
    // would exceed the 200-bucket cap, so this must escalate to a coarser width
    const spreadEvents = [];
    for (let hour = 0; hour < 24; hour += 1) {
      spreadEvents.push(event('dns_poison', 'a', 'v', new Date(latest - hour * 60 * 60000).toISOString()));
    }
    const spreadOverview = computeSiemOverview(spreadEvents, []);

    expect(spreadOverview.timelineBucketMinutes).toBeGreaterThan(1);
    expect(spreadOverview.timelineBars.length).toBeLessThanOrEqual(200);
    expect(spreadOverview.totalEvents).toBe(24);
  });

  it('resolves top attacker/victim display names from any event that carries one, falling back to the raw id for ids that never had a name', () => {
    const events = [
      // old event for "device-1" predates the name-snapshot field - no name
      { eventType: 'arp_spoof', attackerDeviceId: 'device-1', victimDeviceId: 'device-2', created_at: '2026-08-10T10:00:00.000Z' },
      // newer event for the same id now carries a name - should "heal" the display
      {
        eventType: 'arp_spoof',
        attackerDeviceId: 'device-1',
        attackerDeviceName: 'attacker-1',
        victimDeviceId: 'device-2',
        victimDeviceName: 'pc-1',
        created_at: '2026-08-10T10:00:05.000Z',
      },
      // an id that never gets a name anywhere - must fall back to the raw id
      { eventType: 'dns_poison', attackerDeviceId: 'device-3', victimDeviceId: 'device-4', created_at: '2026-08-10T10:00:10.000Z' },
    ];

    const overview = computeSiemOverview(events, []);

    const resolvedAttacker = overview.topAttackers.find((a) => a.id === 'device-1');
    const unresolvedAttacker = overview.topAttackers.find((a) => a.id === 'device-3');
    const resolvedVictim = overview.topVictims.find((v) => v.id === 'device-2');
    const unresolvedVictim = overview.topVictims.find((v) => v.id === 'device-4');

    expect(resolvedAttacker.name).toBe('attacker-1');
    expect(resolvedAttacker.count).toBe(2);
    expect(unresolvedAttacker.name).toBe('device-3');

    expect(resolvedVictim.name).toBe('pc-1');
    expect(unresolvedVictim.name).toBe('device-4');
  });
});
