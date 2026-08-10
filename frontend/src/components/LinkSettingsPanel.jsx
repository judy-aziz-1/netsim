import { useTopologyStore } from '../store/topologyStore';
import { SPEED_OPTIONS_BY_TYPE, formatSpeedLabel } from '../engine/connectionCapabilities';

function LinkSettingsPanel({ link, onClose }) {
  const setLinkEnabled = useTopologyStore((state) => state.setLinkEnabled);
  const setLinkSpeed = useTopologyStore((state) => state.setLinkSpeed);
  const devices = useTopologyStore((state) => state.devices);

  const sourceDevice = devices.find((device) => device.id === link.sourceDeviceId);
  const targetDevice = devices.find((device) => device.id === link.targetDeviceId);
  const isEnabled = link.enabled !== false;
  const speedOptions = SPEED_OPTIONS_BY_TYPE[link.type] ?? SPEED_OPTIONS_BY_TYPE.standard;

  return (
    <div className="device-settings-panel">
      <h2>Link Settings</h2>
      <p className="loading-text">
        {sourceDevice?.name ?? link.sourceDeviceId} ↔ {targetDevice?.name ?? link.targetDeviceId}
      </p>

      <div className="ns-field-group">
        <div className="ns-field-label">Status</div>
        <div className="ns-link-toggle">
          <button
            type="button"
            className={`ns-link-toggle-btn ${isEnabled ? 'active' : ''}`}
            onClick={() => setLinkEnabled(link.id, true)}
          >
            Active
          </button>
          <button
            type="button"
            className={`ns-link-toggle-btn ${!isEnabled ? 'active' : ''}`}
            onClick={() => setLinkEnabled(link.id, false)}
          >
            Disabled
          </button>
        </div>
      </div>

      <div className="ns-field-group">
        <div className="ns-field-label">Speed</div>
        <select
          value={link.speed ?? speedOptions.at(-1)}
          onChange={(event) => setLinkSpeed(link.id, Number(event.target.value))}
        >
          {speedOptions.map((option) => (
            <option key={option} value={option}>
              {formatSpeedLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default LinkSettingsPanel;
