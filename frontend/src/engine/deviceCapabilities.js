const FORWARDING_TYPES = new Set(['switch', 'router']);
const DOS_TARGET_TYPES = new Set(['server']);
const PORT_SCAN_TARGET_TYPES = new Set(['server']);
const IMMUNE_ATTACKER_TYPES = new Set(['firewall']);

const MAX_CONNECTIONS_BY_TYPE = {
  pc: 1,
  server: 1,
  switch: 24,
  router: 8,
  firewall: 2,
  attacker: 1,
};

export function canForward(deviceType) {
  return FORWARDING_TYPES.has(deviceType);
}

export function isImmuneToAttack(deviceType, attackType) {
  return IMMUNE_ATTACKER_TYPES.has(deviceType);
}

export function isValidDosTarget(deviceType) {
  return DOS_TARGET_TYPES.has(deviceType);
}

export function isValidPortScanTarget(deviceType) {
  return PORT_SCAN_TARGET_TYPES.has(deviceType);
}

export function getMaxConnections(deviceType) {
  return MAX_CONNECTIONS_BY_TYPE[deviceType] ?? 1;
}
