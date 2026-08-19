import { describe, expect, it } from 'vitest';
import { buildDosAttackToastMessage } from './dosAttack';

describe('buildDosAttackToastMessage', () => {
  it('returns a success message when the attack was not blocked', () => {
    const result = buildDosAttackToastMessage({ blocked: false, targetName: 'server-1' });

    expect(result).toEqual({
      message: 'DoS flood launched against server-1',
      type: 'success',
    });
  });

  it('returns a blocked message when the target is immune', () => {
    const result = buildDosAttackToastMessage({ blocked: true, targetName: 'firewall-1' });

    expect(result).toEqual({
      message: '⚠ Attack blocked: firewall-1 is immune to DoS attacks (firewall protection)',
      type: 'error',
    });
  });
});
