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

  const hasIp = device.ip != null;

  const [name, setName] = useState(device.name);
  const [ip, setIp] = useState(device.ip ?? '');
  const [mac, setMac] = useState(device.mac);
  const [ipError, setIpError] = useState(null);
  const [macError, setMacError] = useState(null);

  useEffect(() => {
    setName(device.name);
    setIp(device.ip ?? '');
    setMac(device.mac);
    setIpError(null);
    setMacError(null);
  }, [device.id, device.name, device.ip, device.mac]);

  const isValidIPv4 = (value) => {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
    if (!match) {
      return false;
    }

    return match.slice(1).every((octet) => Number(octet) >= 0 && Number(octet) <= 255);
  };

  const isValidMac = (value) => /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(value);

  const handleSave = () => {
    if (hasIp && !isValidIPv4(ip)) {
      setIpError('Invalid IP address — expected four parts 0-255 separated by dots (e.g. 192.168.1.10)');
      return;
    }

    if (!isValidMac(mac)) {
      setMacError('Invalid MAC address — expected six hex pairs separated by colons (e.g. 04:1b:06:4b:96:36)');
      return;
    }

    setIpError(null);
    setMacError(null);
    updateDeviceProperties(device.id, hasIp ? { name, ip, mac } : { name, mac });
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
      <h1 className="device-settings-title">{device.name}</h1>
      <h2>Device Settings</h2>
      <div className="field-row field-column">
        <label className="field-label">Name</label>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {hasIp ? (
        <div className="field-row field-column">
          <label className="field-label">IP Address</label>
          <input
            type="text"
            placeholder="IP"
            value={ip}
            onChange={(event) => {
              setIp(event.target.value);
              setIpError(null);
            }}
          />
        </div>
      ) : (
        <p className="loading-text">N/A — switches do not carry an IP address</p>
      )}
      {ipError && <p className="error-text">{ipError}</p>}
      <div className="field-row field-column">
        <label className="field-label">MAC Address</label>
        <input
          type="text"
          placeholder="MAC"
          value={mac}
          title={mac}
          onChange={(event) => {
            setMac(event.target.value);
            setMacError(null);
          }}
        />
      </div>
      {macError && <p className="error-text">{macError}</p>}
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
                  <td title={mac}>{mac}</td>
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
