export function buildArpTable(devices, links) {
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const arpTables = {};

  devices.forEach((device) => {
    const table = { _self: { ip: device.ip, mac: device.mac } };

    const neighborIds = links
      .filter(
        (link) => link.sourceDeviceId === device.id || link.targetDeviceId === device.id,
      )
      .map((link) =>
        link.sourceDeviceId === device.id ? link.targetDeviceId : link.sourceDeviceId,
      );

    neighborIds.forEach((neighborId) => {
      const neighbor = deviceById.get(neighborId);

      if (neighbor) {
        table[neighbor.ip] = neighbor.mac;
      }
    });

    arpTables[device.id] = table;
  });

  return arpTables;
}

export function simulateArpSpoof(arpTables, attackerDeviceId, victimDeviceId, impersonatedDeviceId) {
  const attackerSelf = arpTables[attackerDeviceId]?._self;
  const impersonatedSelf = arpTables[impersonatedDeviceId]?._self;
  const victimTable = arpTables[victimDeviceId];

  if (!attackerSelf || !impersonatedSelf || !victimTable) {
    return arpTables;
  }

  return {
    ...arpTables,
    [victimDeviceId]: {
      ...victimTable,
      [impersonatedSelf.ip]: attackerSelf.mac,
    },
  };
}

export function isArpTablePoisoned(originalTable, currentTable) {
  const keys = new Set([
    ...Object.keys(originalTable ?? {}),
    ...Object.keys(currentTable ?? {}),
  ]);

  const changedEntries = [];

  keys.forEach((ip) => {
    if (ip === '_self') {
      return;
    }

    const originalMac = originalTable?.[ip];
    const currentMac = currentTable?.[ip];

    if (originalMac !== currentMac) {
      changedEntries.push({ ip, originalMac, currentMac });
    }
  });

  return { isPoisoned: changedEntries.length > 0, changedEntries };
}
