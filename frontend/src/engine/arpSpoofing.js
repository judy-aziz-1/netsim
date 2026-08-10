function buildAdjacency(links) {
  const adjacency = new Map();

  links.forEach((link) => {
    if (!adjacency.has(link.sourceDeviceId)) adjacency.set(link.sourceDeviceId, []);
    if (!adjacency.has(link.targetDeviceId)) adjacency.set(link.targetDeviceId, []);
    adjacency.get(link.sourceDeviceId).push(link.targetDeviceId);
    adjacency.get(link.targetDeviceId).push(link.sourceDeviceId);
  });

  return adjacency;
}

export function buildArpTable(devices, links) {
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const adjacency = buildAdjacency(links);
  const arpTables = {};

  devices.forEach((device) => {
    const table = { _self: { ip: device.ip, mac: device.mac } };

    // Switches are transparent at L2 (they have no IP and are never ARP'd
    // for directly), so walk through any chain of switch neighbors to find
    // every IP-bearing device actually reachable on this broadcast segment.
    const visited = new Set([device.id]);
    const queue = [device.id];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighborIds = adjacency.get(current) ?? [];

      neighborIds.forEach((neighborId) => {
        if (visited.has(neighborId)) {
          return;
        }

        visited.add(neighborId);
        const neighbor = deviceById.get(neighborId);

        if (!neighbor) {
          return;
        }

        if (neighbor.ip) {
          table[neighbor.ip] = neighbor.mac;
        }

        if (neighbor.type === 'switch') {
          queue.push(neighborId);
        }
      });
    }

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

export function clearArpPoison(arpTables, victimDeviceId, impersonatedDeviceId) {
  const impersonatedSelf = arpTables[impersonatedDeviceId]?._self;
  const victimTable = arpTables[victimDeviceId];

  if (!impersonatedSelf || !victimTable) {
    return arpTables;
  }

  return {
    ...arpTables,
    [victimDeviceId]: {
      ...victimTable,
      [impersonatedSelf.ip]: impersonatedSelf.mac,
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

export function findActivePoisonings(devices, links, arpTables) {
  const baseline = buildArpTable(devices, links);
  const results = [];

  devices.forEach((device) => {
    const { changedEntries } = isArpTablePoisoned(baseline[device.id], arpTables[device.id]);

    changedEntries.forEach((entry) => {
      const impersonated = devices.find((candidate) => candidate.ip === entry.ip);
      const attacker = devices.find((candidate) => candidate.mac === entry.currentMac);

      if (impersonated && attacker) {
        results.push({
          victimDeviceId: device.id,
          impersonatedDeviceId: impersonated.id,
          attackerDeviceId: attacker.id,
        });
      }
    });
  });

  return results;
}
