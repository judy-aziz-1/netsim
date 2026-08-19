export function canBeAttacker(deviceType) {
  return deviceType === 'attacker';
}

export function canBeVictim(deviceType) {
  return deviceType !== 'attacker' && deviceType !== 'switch';
}

export function canBeImpersonated(deviceType) {
  return deviceType !== 'switch' && deviceType !== 'attacker';
}
