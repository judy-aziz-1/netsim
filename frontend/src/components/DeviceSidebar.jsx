import { useState } from 'react';
import { useTopologyStore } from '../store/topologyStore';
import routerIconSrc from '../assets/icons/router.svg';
import switchIconSrc from '../assets/icons/switch.svg';
import pcIconSrc from '../assets/icons/pc.svg';
import firewallIconSrc from '../assets/icons/firewall.svg';
import ConfirmDialog from './ConfirmDialog';

const DEVICE_DEFS = [
  { type: 'router', label: 'Router', iconClass: 'ns-device-icon-router', x: 100, y: 100 },
  { type: 'pc', label: 'PC', x: 200, y: 100 },
  { type: 'switch', label: 'Switch', x: 300, y: 100 },
  { type: 'firewall', label: 'Firewall', x: 400, y: 100 },
  { type: 'server', label: 'Server', x: 500, y: 100 },
  { type: 'attacker', label: 'Attacker', iconClass: 'ns-device-icon-attacker', x: 600, y: 100 },
];

const DEVICE_ICON_SRC = {
  router: routerIconSrc,
  pc: pcIconSrc,
  switch: switchIconSrc,
  firewall: firewallIconSrc,
};

function ServerIcon() {
  return (
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
      <rect x="8" y="3" width="16" height="26" rx="1.6" fill="slategray" />
      <line x1="11" y1="10" x2="21" y2="10" stroke="white" strokeWidth="1.5" />
      <line x1="11" y1="16" x2="21" y2="16" stroke="white" strokeWidth="1.5" />
      <line x1="11" y1="22" x2="21" y2="22" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function AttackerIcon() {
  return (
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
      <circle cx="16" cy="10" r="5" fill="#e74c3c" />
      <polygon points="8,26 24,26 16,14" fill="#e74c3c" />
    </svg>
  );
}

function DeviceIcon({ type }) {
  if (DEVICE_ICON_SRC[type]) {
    return <img src={DEVICE_ICON_SRC[type]} width="18" height="18" alt="" />;
  }
  if (type === 'server') {
    return <ServerIcon />;
  }
  return <AttackerIcon />;
}

function DeviceSidebar({ onOpenSaveTopology, onOpenLoadTopology }) {
  const addDevice = useTopologyStore((state) => state.addDevice);
  const clearTopology = useTopologyStore((state) => state.clearTopology);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    clearTopology();
    setShowClearConfirm(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
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
            <span className={`ns-device-icon ${device.iconClass ?? ''}`}>
              <DeviceIcon type={device.type} />
            </span>
            <span>{device.label}</span>
          </button>
        ))}
      </div>

      <div className="ns-sidebar-actions">
        <div className="ns-divider" />
        <button type="button" className="ns-clear-btn ns-clear-btn-primary" onClick={onOpenSaveTopology}>
          Save Topology
        </button>
        <button type="button" className="ns-clear-btn ns-clear-btn-primary" onClick={onOpenLoadTopology}>
          Load Topology
        </button>
        <button type="button" className="ns-clear-btn" onClick={handleClear}>
          Clear
        </button>
      </div>

      {showClearConfirm && (
        <ConfirmDialog
          message="Clear entire topology? This cannot be undone."
          confirmLabel="Clear"
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      )}
    </div>
  );
}

export default DeviceSidebar;
