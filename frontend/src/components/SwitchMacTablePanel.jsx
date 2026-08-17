import { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/topologyStore';

function SwitchMacTablePanel({ device, onClose }) {
  const links = useTopologyStore((state) => state.links);
  const devices = useTopologyStore((state) => state.devices);
  const updateDeviceProperties = useTopologyStore((state) => state.updateDeviceProperties);

  const [name, setName] = useState(device.name);

  useEffect(() => {
    setName(device.name);
  }, [device.id, device.name]);

  const handleSave = () => {
    updateDeviceProperties(device.id, { name });
    onClose();
  };

  const connectedEntries = links
    .filter((link) => link.sourceDeviceId === device.id || link.targetDeviceId === device.id)
    .map((link) => {
      const otherDeviceId =
        link.sourceDeviceId === device.id ? link.targetDeviceId : link.sourceDeviceId;
      return devices.find((candidate) => candidate.id === otherDeviceId);
    })
    .filter(Boolean);

  return (
    <div className="device-settings-panel">
      <h2>MAC Address Table</h2>
      <div className="field-row field-column">
        <label className="field-label">Name</label>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      {connectedEntries.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Port</th>
              <th>MAC Address</th>
            </tr>
          </thead>
          <tbody>
            {connectedEntries.map((entry, index) => (
              <tr key={entry.id}>
                <td>Port {index + 1}</td>
                <td>{entry.mac}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="loading-text">No connected devices</p>
      )}

      <div className="field-row">
        <button className="btn" onClick={handleSave}>Save</button>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default SwitchMacTablePanel;
