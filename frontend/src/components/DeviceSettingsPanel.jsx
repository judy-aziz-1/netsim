import { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/topologyStore';

function DeviceSettingsPanel({ device, onClose }) {
  const updateDeviceProperties = useTopologyStore((state) => state.updateDeviceProperties);

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
    </div>
  );
}

export default DeviceSettingsPanel;
