import { describe, expect, it } from 'vitest';
import { getSpeedMultiplier, isValidConnectionType } from './connectionCapabilities';

describe('isValidConnectionType', () => {
  it('allows standard connections between any device types', () => {
    expect(isValidConnectionType('standard', 'pc', 'router')).toBe(true);
    expect(isValidConnectionType('standard', 'attacker', 'firewall')).toBe(true);
  });

  it('allows backbone connections only when both endpoints can forward', () => {
    expect(isValidConnectionType('backbone', 'router', 'switch')).toBe(true);
    expect(isValidConnectionType('backbone', 'switch', 'switch')).toBe(true);
  });

  it('rejects backbone connections when either endpoint cannot forward', () => {
    expect(isValidConnectionType('backbone', 'pc', 'router')).toBe(false);
    expect(isValidConnectionType('backbone', 'router', 'firewall')).toBe(false);
    expect(isValidConnectionType('backbone', 'server', 'attacker')).toBe(false);
  });

  it('rejects unknown connection types', () => {
    expect(isValidConnectionType('wireless', 'router', 'switch')).toBe(false);
  });
});

describe('getSpeedMultiplier', () => {
  it('returns 1.0 for standard connections', () => {
    expect(getSpeedMultiplier('standard')).toBe(1.0);
  });

  it('returns 1.5 for backbone connections', () => {
    expect(getSpeedMultiplier('backbone')).toBe(1.5);
  });

  it('falls back to 1.0 for an unknown or undefined connection type', () => {
    expect(getSpeedMultiplier('unknown')).toBe(1.0);
    expect(getSpeedMultiplier(undefined)).toBe(1.0);
  });
});
