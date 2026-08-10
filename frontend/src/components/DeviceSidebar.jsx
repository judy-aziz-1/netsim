import { useTopologyStore } from '../store/topologyStore';

const DEVICE_DEFS = [
  { type: 'router', label: 'Router', glyph: 'R', iconClass: 'ns-device-icon-router', x: 100, y: 100 },
  { type: 'pc', label: 'PC', glyph: 'PC', x: 200, y: 100 },
  { type: 'switch', label: 'Switch', glyph: 'SW', x: 300, y: 100 },
  { type: 'firewall', label: 'Firewall', glyph: 'FW', x: 400, y: 100 },
  { type: 'server', label: 'Server', glyph: 'SV', x: 500, y: 100 },
  { type: 'attacker', label: 'Attacker', glyph: '!', iconClass: 'ns-device-icon-attacker', x: 600, y: 100 },
];

function DeviceSidebar() {
  const addDevice = useTopologyStore((state) => state.addDevice);
  const clearTopology = useTopologyStore((state) => state.clearTopology);

  const handleClear = () => {
    if (window.confirm('Clear entire topology? This cannot be undone.')) {
      clearTopology();
    }
  };

  return (
    <div className="ns-sidebar">
      <div className="ns-devices-section">
        <div className="ns-section-label">Devices</div>
        {DEVICE_DEFS.map((device) => (
          <button
            key={device.type}
            type="button"
            className="ns-device-row"
            onClick={() => addDevice(device.type, device.x, device.y)}
          >
            <span className={`ns-device-icon ${device.iconClass ?? ''}`}>{device.glyph}</span>
            <span>{device.label}</span>
          </button>
        ))}
        <button type="button" className="ns-clear-btn" onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default DeviceSidebar;
