import { describe, expect, it } from 'vitest';
import { buildDnsTable, isDnsTablePoisoned, simulateDnsPoison } from './dnsPoisoning';

const devices = [
  { id: 'dev-a', name: 'alice', ip: '10.0.0.1' },
  { id: 'dev-b', name: 'bob', ip: '10.0.0.2' },
];

describe('buildDnsTable', () => {
  it('builds a table mapping each device name to its ip', () => {
    const table = buildDnsTable(devices);

    expect(table['dev-a']).toEqual({ 'alice.local': '10.0.0.1' });
    expect(table['dev-b']).toEqual({ 'bob.local': '10.0.0.2' });
  });
});

describe('simulateDnsPoison', () => {
  it('poisons only the victim table with the fake ip', () => {
    const dnsTables = buildDnsTable(devices);
    const poisoned = simulateDnsPoison(dnsTables, 'dev-a', 'dev-b', 'bob.local', '6.6.6.6');

    expect(poisoned['dev-b']['bob.local']).toBe('6.6.6.6');
    expect(poisoned['dev-a']).toEqual(dnsTables['dev-a']);
  });

  it('does not mutate the original dns tables', () => {
    const dnsTables = buildDnsTable(devices);
    const snapshot = JSON.parse(JSON.stringify(dnsTables));

    simulateDnsPoison(dnsTables, 'dev-a', 'dev-b', 'bob.local', '6.6.6.6');

    expect(dnsTables).toEqual(snapshot);
  });

  it('returns the original tables unchanged for an unknown victim', () => {
    const dnsTables = buildDnsTable(devices);
    const result = simulateDnsPoison(dnsTables, 'dev-a', 'missing', 'bob.local', '6.6.6.6');

    expect(result).toBe(dnsTables);
  });
});

describe('isDnsTablePoisoned', () => {
  it('detects no difference between identical tables', () => {
    const table = { 'alice.local': '10.0.0.1' };

    expect(isDnsTablePoisoned(table, table)).toEqual({ isPoisoned: false, changedEntries: [] });
  });

  it('detects a changed domain entry', () => {
    const original = { 'bob.local': '10.0.0.2' };
    const current = { 'bob.local': '6.6.6.6' };

    const result = isDnsTablePoisoned(original, current);

    expect(result.isPoisoned).toBe(true);
    expect(result.changedEntries).toEqual([
      { domainName: 'bob.local', originalIp: '10.0.0.2', currentIp: '6.6.6.6' },
    ]);
  });
});
