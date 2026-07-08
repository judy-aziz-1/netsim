export function buildDnsTable(devices) {
  const dnsTables = {};

  devices.forEach((device) => {
    dnsTables[device.id] = {
      [`${device.name}.local`]: device.ip,
    };
  });

  return dnsTables;
}

export function simulateDnsPoison(dnsTables, attackerDeviceId, victimDeviceId, targetDomain, fakeIp) {
  const victimTable = dnsTables[victimDeviceId];

  if (!victimTable) {
    return dnsTables;
  }

  return {
    ...dnsTables,
    [victimDeviceId]: {
      ...victimTable,
      [targetDomain]: fakeIp,
    },
  };
}

export function isDnsTablePoisoned(originalTable, currentTable) {
  const keys = new Set([
    ...Object.keys(originalTable ?? {}),
    ...Object.keys(currentTable ?? {}),
  ]);

  const changedEntries = [];

  keys.forEach((domainName) => {
    const originalIp = originalTable?.[domainName];
    const currentIp = currentTable?.[domainName];

    if (originalIp !== currentIp) {
      changedEntries.push({ domainName, originalIp, currentIp });
    }
  });

  return { isPoisoned: changedEntries.length > 0, changedEntries };
}
