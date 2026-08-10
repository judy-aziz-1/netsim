import { describe, expect, it } from 'vitest';
import { buildArpTable, isArpTablePoisoned, simulateArpSpoof, clearArpPoison, findActivePoisonings } from './arpSpoofing';

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

    const restored = clearArpPoison(poisoned, 'dev-b', 'dev-c');

    expect(restored['dev-b']['10.0.0.3']).toBe('CC:CC:CC:CC:CC:CC');
    expect(restored['dev-b']['10.0.0.1']).toBe(poisoned['dev-b']['10.0.0.1']);
    expect(restored['dev-a']).toEqual(poisoned['dev-a']);
    expect(restored['dev-c']).toEqual(poisoned['dev-c']);
  });

  it('does not mutate the original arp tables', () => {
    const baseline = buildArpTable(devices, links);
    const poisoned = simulateArpSpoof(baseline, 'dev-a', 'dev-b', 'dev-c');
    const snapshot = JSON.parse(JSON.stringify(poisoned));

    clearArpPoison(poisoned, 'dev-b', 'dev-c');

    expect(poisoned).toEqual(snapshot);
  });

  it('returns the original tables unchanged for an unknown device', () => {
    const arpTables = buildArpTable(devices, links);
    const result = clearArpPoison(arpTables, 'dev-b', 'missing');

    expect(result).toBe(arpTables);
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
