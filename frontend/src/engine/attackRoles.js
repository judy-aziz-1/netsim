export function canBeAttacker(deviceType) {
  return deviceType === 'attacker';
}

export function canBeVictim(deviceType) {
  return deviceType !== 'attacker';
}
