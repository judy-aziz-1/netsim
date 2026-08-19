export function buildDosAttackToastMessage({ blocked, targetName }) {
  if (blocked) {
    return {
      message: `⚠ Attack blocked: ${targetName} is immune to DoS attacks (firewall protection)`,
      type: 'error',
    };
  }

  return {
    message: `DoS flood launched against ${targetName}`,
    type: 'success',
  };
}
