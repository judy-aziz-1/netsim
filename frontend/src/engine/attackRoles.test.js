import { describe, expect, it } from 'vitest';
import { canBeVictim, canBeImpersonated } from './attackRoles';

describe('canBeVictim', () => {
  it('excludes switch (no IP address, cannot be an ARP victim)', () => {
    expect(canBeVictim('switch')).toBe(false);
  });

  it('excludes attacker (existing rule)', () => {
    expect(canBeVictim('attacker')).toBe(false);
  });

  it('allows regular device types', () => {
    expect(canBeVictim('pc')).toBe(true);
  });
});

describe('canBeImpersonated', () => {
  it('excludes switch (no IP address, cannot be impersonated)', () => {
    expect(canBeImpersonated('switch')).toBe(false);
  });

  it('excludes attacker (mirrors canBeVictim in bidirectional mode)', () => {
    expect(canBeImpersonated('attacker')).toBe(false);
  });

  it('allows regular device types', () => {
    expect(canBeImpersonated('pc')).toBe(true);
  });
});
