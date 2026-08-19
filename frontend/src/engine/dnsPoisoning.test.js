import { describe, expect, it } from 'vitest';
import {
  buildDnsTable,
  isDnsTablePoisoned,
  simulateDnsPoison,
  clearDnsPoison,
  findActiveDnsPoisonings,
  buildDnsPoisonToastMessage,
} from './dnsPoisoning';

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

describe('clearDnsPoison', () => {
  it('removes only the targeted domain entry, leaving other domains/devices untouched', () => {
    const dnsTables = buildDnsTable(devices);
    const poisoned = simulateDnsPoison(dnsTables, 'dev-a', 'dev-b', 'evil.com', '6.6.6.6');

    const restored = clearDnsPoison(poisoned, 'dev-b', 'evil.com');

    expect(restored['dev-b']['evil.com']).toBeUndefined();
    expect(restored['dev-b']['bob.local']).toBe(poisoned['dev-b']['bob.local']);
    expect(restored['dev-a']).toEqual(poisoned['dev-a']);
  });

  it('does not mutate the original dns tables', () => {
    const dnsTables = buildDnsTable(devices);
    const poisoned = simulateDnsPoison(dnsTables, 'dev-a', 'dev-b', 'evil.com', '6.6.6.6');
    const snapshot = JSON.parse(JSON.stringify(poisoned));

    clearDnsPoison(poisoned, 'dev-b', 'evil.com');

    expect(poisoned).toEqual(snapshot);
  });

  it('returns the original tables unchanged for an unknown victim', () => {
    const dnsTables = buildDnsTable(devices);
    const result = clearDnsPoison(dnsTables, 'missing', 'evil.com');

    expect(result).toBe(dnsTables);
  });
});

describe('findActiveDnsPoisonings', () => {
  it('returns an empty array when nothing is poisoned', () => {
    const dnsTables = buildDnsTable(devices);

    expect(findActiveDnsPoisonings(devices, dnsTables)).toEqual([]);
  });

  it('returns one entry with the attacker resolved from the fake ip', () => {
    const dnsTables = buildDnsTable(devices);
    const poisoned = simulateDnsPoison(dnsTables, 'dev-a', 'dev-b', 'evil.com', '10.0.0.1');

    const result = findActiveDnsPoisonings(devices, poisoned);

    expect(result).toEqual([
      { victimDeviceId: 'dev-b', targetDomain: 'evil.com', fakeIp: '10.0.0.1', attackerDeviceId: 'dev-a' },
    ]);
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

describe('buildDnsPoisonToastMessage', () => {
  it('returns the plain success message when not blocked', () => {
    const result = buildDnsPoisonToastMessage({
      blocked: false,
      victimName: 'pc-1',
      targetDomain: 'server-1.local',
      fakeIp: '192.168.1.45',
    });

    expect(result).toEqual({
      message: 'victim device pc-1 now resolves server-1.local to 192.168.1.45',
      type: 'success',
    });
  });

  it('returns a blocked message when the victim is immune', () => {
    const result = buildDnsPoisonToastMessage({
      blocked: true,
      victimName: 'firewall-1',
      targetDomain: 'server-1.local',
      fakeIp: '192.168.1.45',
    });

    expect(result).toEqual({
      message: '⚠ Attack blocked: firewall-1 is immune to DNS poisoning (firewall protection)',
      type: 'error',
    });
  });
});
