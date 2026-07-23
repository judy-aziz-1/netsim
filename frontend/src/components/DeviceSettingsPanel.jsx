import { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/topologyStore';
import { buildArpTable, isArpTablePoisoned } from '../engine/arpSpoofing';
import { buildDnsTable, isDnsTablePoisoned } from '../engine/dnsPoisoning';

function DeviceSettingsPanel({ device, onClose }) {
  const updateDeviceProperties = useTopologyStore((state) => state.updateDeviceProperties);
  const devices = useTopologyStore((state) => state.devices);
  const links = useTopologyStore((state) => state.links);
  const arpTables = useTopologyStore((state) => state.arpTables);
  const dnsTables = useTopologyStore((state) => state.dnsTables);

  const [name, setName] = useState(device.name);
  const [ip, setIp] = useState(device.ip);
  const [mac, setMac] = useState(device.mac);

  useEffect(() => {
    setName(device.name);
    setIp(device.ip);
    setMac(device.mac);
  }, [device.id, device.name, device.ip, device.mac]);

  const handleSave = () => {
    updateDeviceProperties(device.id, { name, ip, mac });
    onClose();
  };

  const currentArpTable = arpTables[device.id];
  const currentDnsTable = dnsTables[device.id];

  const baselineArpTable = buildArpTable(devices, links)[device.id];
  const baselineDnsTable = buildDnsTable(devices)[device.id];

  const arpPoisoned = isArpTablePoisoned(baselineArpTable, currentArpTable);
  const dnsPoisoned = isDnsTablePoisoned(baselineDnsTable, currentDnsTable);

  const poisonedIps = new Set(arpPoisoned.changedEntries.map((entry) => entry.ip));
  const poisonedDomains = new Set(dnsPoisoned.changedEntries.map((entry) => entry.domainName));

  return (
    <div className="device-settings-panel">
      <h2>Device Settings</h2>
      <div className="field-row">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="field-row">
        <input
          type="text"
          placeholder="IP"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
        />
      </div>
      <div className="field-row">
        <input
          type="text"
          placeholder="MAC"
          value={mac}
          onChange={(event) => setMac(event.target.value)}
        />
      </div>
      <div className="field-row">
        <button className="btn" onClick={handleSave}>Save</button>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <h3>ARP Table</h3>
      {currentArpTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>IP</th>
              <th>MAC</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(currentArpTable)
              .filter(([ipKey]) => ipKey !== '_self')
              .map(([ipKey, mac]) => (
                <tr key={ipKey} className={poisonedIps.has(ipKey) ? 'table-row-poisoned' : ''}>
                  <td>{ipKey}</td>
                  <td>{mac}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <p className="loading-text">No data yet</p>
      )}

      <h3>DNS Table</h3>
      {currentDnsTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(currentDnsTable).map(([domain, resolvedIp]) => (
              <tr key={domain} className={poisonedDomains.has(domain) ? 'table-row-poisoned' : ''}>
                <td>{domain}</td>
                <td>{resolvedIp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="loading-text">No data yet</p>
      )}
    </div>
  );
}

export default DeviceSettingsPanel;
