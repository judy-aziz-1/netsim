export function buildDnsTable(devices) {
  const dnsTables = {};

  devices.forEach((device) => {
    dnsTables[device.id] = device.ip ? { [`${device.name}.local`]: device.ip } : {};
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

// buildDnsTable never seeds a device's table with a neighbor/foreign domain
// entry (unlike arpTables, which always has a clean baseline value for every
// reachable neighbor) — a poisoned domain key is always new. The correct
// inverse of simulateDnsPoison is therefore removing that key entirely, not
// restoring it to some baseline value that never existed.
export function clearDnsPoison(dnsTables, victimDeviceId, targetDomain) {
  const victimTable = dnsTables[victimDeviceId];

  if (!victimTable) {
    return dnsTables;
  }

  const updatedTable = { ...victimTable };
  delete updatedTable[targetDomain];

  return { ...dnsTables, [victimDeviceId]: updatedTable };
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

export function findActiveDnsPoisonings(devices, dnsTables) {
  const baseline = buildDnsTable(devices);
  const results = [];

  devices.forEach((device) => {
    const { changedEntries } = isDnsTablePoisoned(baseline[device.id], dnsTables[device.id]);

    changedEntries.forEach((entry) => {
      const attacker = devices.find((candidate) => candidate.ip === entry.currentIp);

      if (attacker) {
        results.push({
          victimDeviceId: device.id,
          targetDomain: entry.domainName,
          fakeIp: entry.currentIp,
          attackerDeviceId: attacker.id,
        });
      }
    });
  });

  return results;
}

export function buildDnsPoisonToastMessage({ blocked, victimName, targetDomain, fakeIp }) {
  if (blocked) {
    return {
      message: `⚠ Attack blocked: ${victimName} is immune to DNS poisoning (firewall protection)`,
      type: 'error',
    };
  }

  return {
    message: `victim device ${victimName} now resolves ${targetDomain} to ${fakeIp}`,
    type: 'success',
  };
}
