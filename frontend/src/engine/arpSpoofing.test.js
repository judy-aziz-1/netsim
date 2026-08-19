import { describe, expect, it } from 'vitest';
import {
  buildArpTable,
  isArpTablePoisoned,
  simulateArpSpoof,
  clearArpPoison,
  findActivePoisonings,
  buildArpSpoofToastMessage,
} from './arpSpoofing';

const devices = [
  { id: 'dev-a', ip: '10.0.0.1', mac: 'AA:AA:AA:AA:AA:AA' },
  { id: 'dev-b', ip: '10.0.0.2', mac: 'BB:BB:BB:BB:BB:BB' },
  { id: 'dev-c', ip: '10.0.0.3', mac: 'CC:CC:CC:CC:CC:CC' },
];

const links = [
  { sourceDeviceId: 'dev-a', targetDeviceId: 'dev-b' },
  { sourceDeviceId: 'dev-b', targetDeviceId: 'dev-c' },
];

describe('buildArpTable', () => {
  it('builds a table with self entry and neighbor entries', () => {
    const table = buildArpTable(devices, links);

    expect(table['dev-a']).toEqual({
      _self: { ip: '10.0.0.1', mac: 'AA:AA:AA:AA:AA:AA' },
      '10.0.0.2': 'BB:BB:BB:BB:BB:BB',
    });

    expect(table['dev-b']).toEqual({
      _self: { ip: '10.0.0.2', mac: 'BB:BB:BB:BB:BB:BB' },
      '10.0.0.1': 'AA:AA:AA:AA:AA:AA',
      '10.0.0.3': 'CC:CC:CC:CC:CC:CC',
    });
  });
});

describe('simulateArpSpoof', () => {
  it('poisons only the victim table with the attacker mac', () => {
    const arpTables = buildArpTable(devices, links);
    const poisoned = simulateArpSpoof(arpTables, 'dev-a', 'dev-b', 'dev-c');

    expect(poisoned['dev-b']['10.0.0.3']).toBe('AA:AA:AA:AA:AA:AA');
    expect(poisoned['dev-a']).toEqual(arpTables['dev-a']);
    expect(poisoned['dev-c']).toEqual(arpTables['dev-c']);
  });

  it('does not mutate the original arp tables', () => {
    const arpTables = buildArpTable(devices, links);
    const snapshot = JSON.parse(JSON.stringify(arpTables));

    simulateArpSpoof(arpTables, 'dev-a', 'dev-b', 'dev-c');

    expect(arpTables).toEqual(snapshot);
  });

  it('returns the original tables unchanged for an unknown device', () => {
    const arpTables = buildArpTable(devices, links);
    const result = simulateArpSpoof(arpTables, 'missing', 'dev-b', 'dev-c');

    expect(result).toBe(arpTables);
  });
});

describe('clearArpPoison', () => {
  it('restores only the targeted entry, leaving unrelated entries untouched', () => {
    const baseline = buildArpTable(devices, links);
    const poisoned = simulateArpSpoof(baseline, 'dev-a', 'dev-b', 'dev-c');

    const restored = clearArpPoison(poisoned, 'dev-b', 'dev-c', devices, links);

    expect(restored['dev-b']['10.0.0.3']).toBe('CC:CC:CC:CC:CC:CC');
    expect(restored['dev-b']['10.0.0.1']).toBe(poisoned['dev-b']['10.0.0.1']);
    expect(restored['dev-a']).toEqual(poisoned['dev-a']);
    expect(restored['dev-c']).toEqual(poisoned['dev-c']);
  });

  it('does not mutate the original arp tables', () => {
    const baseline = buildArpTable(devices, links);
    const poisoned = simulateArpSpoof(baseline, 'dev-a', 'dev-b', 'dev-c');
    const snapshot = JSON.parse(JSON.stringify(poisoned));

    clearArpPoison(poisoned, 'dev-b', 'dev-c', devices, links);

    expect(poisoned).toEqual(snapshot);
  });

  it('returns the original tables unchanged for an unknown device', () => {
    const arpTables = buildArpTable(devices, links);
    const result = clearArpPoison(arpTables, 'dev-b', 'missing', devices, links);

    expect(result).toBe(arpTables);
  });

  it('deletes a phantom key that was never in the real baseline, instead of restoring a bogus value', () => {
    // dev-x is not linked to anything, so it can never legitimately appear in
    // dev-b's real ARP table. Simulate a phantom key having been planted
    // anyway (e.g. by validation that let it through), then confirm clearing
    // it removes the key entirely rather than "restoring" it to dev-x's mac.
    const isolatedDevices = [...devices, { id: 'dev-x', ip: '10.0.0.99', mac: 'FF:FF:FF:FF:FF:FF' }];
    const baseline = buildArpTable(isolatedDevices, links);
    const phantomPoisoned = {
      ...baseline,
      'dev-b': { ...baseline['dev-b'], '10.0.0.99': 'AA:AA:AA:AA:AA:AA' },
    };

    const result = clearArpPoison(phantomPoisoned, 'dev-b', 'dev-x', isolatedDevices, links);

    expect('10.0.0.99' in result['dev-b']).toBe(false);
  });
});

describe('isArpTablePoisoned', () => {
  it('detects no difference between identical tables', () => {
    const table = { _self: { ip: '10.0.0.2', mac: 'BB' }, '10.0.0.1': 'AA' };

    expect(isArpTablePoisoned(table, table)).toEqual({ isPoisoned: false, changedEntries: [] });
  });

  it('detects a changed mac entry, ignoring _self', () => {
    const original = { _self: { ip: '10.0.0.2', mac: 'BB' }, '10.0.0.3': 'CC' };
    const current = { _self: { ip: '10.0.0.2', mac: 'BB' }, '10.0.0.3': 'AA' };

    const result = isArpTablePoisoned(original, current);

    expect(result.isPoisoned).toBe(true);
    expect(result.changedEntries).toEqual([{ ip: '10.0.0.3', originalMac: 'CC', currentMac: 'AA' }]);
  });
});

describe('findActivePoisonings', () => {
  it('returns an empty array when nothing is poisoned', () => {
    const arpTables = buildArpTable(devices, links);

    expect(findActivePoisonings(devices, links, arpTables)).toEqual([]);
  });

  it('returns one entry for a one-way poisoning', () => {
    const baseline = buildArpTable(devices, links);
    const poisoned = simulateArpSpoof(baseline, 'dev-a', 'dev-b', 'dev-c');

    const result = findActivePoisonings(devices, links, poisoned);

    expect(result).toEqual([
      { victimDeviceId: 'dev-b', impersonatedDeviceId: 'dev-c', attackerDeviceId: 'dev-a' },
    ]);
  });

  it('returns two entries (opposite directions) for a bidirectional poisoning', () => {
    const baseline = buildArpTable(devices, links);
    let poisoned = simulateArpSpoof(baseline, 'dev-a', 'dev-b', 'dev-c');
    poisoned = simulateArpSpoof(poisoned, 'dev-a', 'dev-c', 'dev-b');

    const result = findActivePoisonings(devices, links, poisoned);

    expect(result).toEqual(
      expect.arrayContaining([
        { victimDeviceId: 'dev-b', impersonatedDeviceId: 'dev-c', attackerDeviceId: 'dev-a' },
        { victimDeviceId: 'dev-c', impersonatedDeviceId: 'dev-b', attackerDeviceId: 'dev-a' },
      ]),
    );
    expect(result).toHaveLength(2);
  });
});

describe('buildArpSpoofToastMessage', () => {
  const names = { attackerName: 'attacker-1', victimName: 'firewall-1', impersonatedName: 'server-1' };

  it('returns the plain success message when nothing was blocked (one-way)', () => {
    const result = buildArpSpoofToastMessage({
      bidirectional: false,
      forwardBlocked: false,
      reverseBlocked: false,
      ...names,
    });

    expect(result).toEqual({
      message: 'victim device firewall-1 now believes MAC of attacker attacker-1 belongs to device server-1',
      type: 'success',
    });
  });

  it('returns the plain success message when nothing was blocked (bidirectional)', () => {
    const result = buildArpSpoofToastMessage({
      bidirectional: true,
      forwardBlocked: false,
      reverseBlocked: false,
      ...names,
    });

    expect(result.type).toBe('success');
  });

  it('returns a full-block message for a one-way trigger against an immune victim', () => {
    const result = buildArpSpoofToastMessage({
      bidirectional: false,
      forwardBlocked: true,
      reverseBlocked: false,
      ...names,
    });

    expect(result).toEqual({
      message: '⚠ Attack blocked: firewall-1 is immune to ARP spoofing (firewall protection)',
      type: 'error',
    });
  });

  it('returns a partial-block message when only the forward (victim) leg is blocked, reverse succeeded', () => {
    const result = buildArpSpoofToastMessage({
      bidirectional: true,
      forwardBlocked: true,
      reverseBlocked: false,
      ...names,
    });

    expect(result).toEqual({
      message:
        '⚠ Attack partially blocked: firewall-1 is immune to ARP spoofing (firewall protection) — server-1 was poisoned in the reverse direction',
      type: 'error',
    });
  });

  it('returns a partial-block message when only the reverse (impersonated) leg is blocked, forward succeeded', () => {
    const result = buildArpSpoofToastMessage({
      bidirectional: true,
      forwardBlocked: false,
      reverseBlocked: true,
      ...names,
    });

    expect(result).toEqual({
      message:
        '⚠ Attack partially blocked: server-1 is immune to ARP spoofing (firewall protection) — firewall-1 was poisoned in the forward direction',
      type: 'error',
    });
  });

  it('returns a full-block message when both legs are blocked in bidirectional mode', () => {
    const result = buildArpSpoofToastMessage({
      bidirectional: true,
      forwardBlocked: true,
      reverseBlocked: true,
      ...names,
    });

    expect(result).toEqual({
      message: '⚠ Attack blocked: both firewall-1 and server-1 are immune to ARP spoofing (firewall protection)',
      type: 'error',
    });
  });
});
