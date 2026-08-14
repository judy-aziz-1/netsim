import { useState } from 'react';
import { canBeAttacker, canBeVictim, canBeImpersonated } from '../engine/attackRoles';

const TOOL_TABS = [
  { id: 'ping', label: 'Ping' },
  { id: 'arp', label: 'ARP Attack' },
  { id: 'dns', label: 'DNS Attack' },
];

function DeviceOptions({ devices }) {
  return devices.map((device) => (
    <option key={device.id} value={device.id}>
      {device.name}
    </option>
  ));
}

function AttackField({ label, children }) {
  return (
    <div className="ns-attack-field">
      <div className="ns-field-label">{label}</div>
      {children}
    </div>
  );
}

function AttackPanel({
  devices,
  pendingLinkType,
  setPendingLinkType,
  sourceDeviceId,
  setSourceDeviceId,
  targetDeviceId,
  setTargetDeviceId,
  handlePing,
  pingResult,
  pingHistory,
  attackerDeviceId,
  setAttackerDeviceId,
  victimDeviceId,
  setVictimDeviceId,
  impersonatedDeviceId,
  setImpersonatedDeviceId,
  handleTriggerArpSpoof,
  arpError,
  isArpAttackActive,
  handleStopArpSpoof,
  arpBidirectional,
  setArpBidirectional,
  activePoisoningCount,
  dnsAttackerDeviceId,
  setDnsAttackerDeviceId,
  dnsVictimDeviceId,
  setDnsVictimDeviceId,
  targetDomain,
  setTargetDomain,
  fakeIp,
  setFakeIp,
  handleTriggerDnsPoison,
  dnsError,
  isDnsAttackActive,
  handleStopDnsPoison,
}) {
  const [activeToolTab, setActiveToolTab] = useState('ping');

  return (
    <div className="ns-attack-panel">
      <div className="ns-attack-panel-top">
        <div className="ns-section-label">Attacks &amp; Tools</div>

        <div className={`ns-poison-status ${activePoisoningCount > 0 ? 'ns-poison-status-active' : ''}`}>
          {activePoisoningCount > 0
            ? `${activePoisoningCount} active poisoned ${activePoisoningCount === 1 ? 'entry' : 'entries'}`
            : 'No active attacks'}
        </div>

        <div className="ns-field-group">
          <div className="ns-field-label">Link Type</div>
          <div className="ns-link-toggle">
            <button
              type="button"
              className={`ns-link-toggle-btn ${pendingLinkType !== 'backbone' ? 'active' : ''}`}
              onClick={() => setPendingLinkType('standard')}
            >
              Standard
            </button>
            <button
              type="button"
              className={`ns-link-toggle-btn ${pendingLinkType === 'backbone' ? 'active' : ''}`}
              onClick={() => setPendingLinkType('backbone')}
            >
              Backbone
            </button>
          </div>
        </div>

        <div className="ns-tool-tabs">
          {TOOL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ns-tool-tab ${activeToolTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveToolTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ns-divider" />

      <div className="ns-attack-panel-fields">
        {activeToolTab === 'ping' && (
          <>
            <AttackField label="Source device">
              <select value={sourceDeviceId} onChange={(event) => setSourceDeviceId(event.target.value)}>
                <option value="">Source device</option>
                <DeviceOptions devices={devices} />
              </select>
            </AttackField>

            <AttackField label="Target device">
              <select value={targetDeviceId} onChange={(event) => setTargetDeviceId(event.target.value)}>
                <option value="">Target device</option>
                <DeviceOptions devices={devices} />
              </select>
            </AttackField>

            <div className="ns-attack-panel-buttons">
              <button type="button" className="ns-attack-btn ns-attack-btn-primary" onClick={handlePing}>
                Run Ping
              </button>
            </div>

            {pingResult && (
              <div className="ns-ping-result">
                <div className={`ns-ping-badge ${pingResult.success ? 'ns-ping-badge-success' : 'ns-ping-badge-failed'}`}>
                  {pingResult.success ? '✓ Success' : '✗ Failed'}
                </div>
                {pingResult.success ? (
                  <>
                    <div className="ns-ping-path">
                      {pingResult.path.map((id) => devices.find((device) => device.id === id)?.name ?? id).join(' → ')}
                    </div>
                    <div className="ns-ping-meta">Hops: {pingResult.hops}</div>
                    <div className="ns-ping-meta">Latency: {Math.round(pingResult.latencyMs)} ms</div>
                  </>
                ) : (
                  <div className="ns-ping-meta">{pingResult.message}</div>
                )}
              </div>
            )}

            {pingHistory && pingHistory.length > 0 && (
              <div className="ns-ping-history">
                <div className="ns-field-label">Recent Pings</div>
                {pingHistory.map((entry) => (
                  <div key={entry.id} className="ns-ping-history-item">
                    <div className="ns-ping-history-row">
                      <span
                        className={`ns-ping-history-badge ${entry.success ? 'ns-ping-badge-success' : 'ns-ping-badge-failed'}`}
                      >
                        {entry.success ? '✓' : '✗'}
                      </span>
                      {entry.success && (
                        <span className="ns-ping-history-tag">
                          {entry.linkTypeSummary === 'backbone'
                            ? 'Backbone'
                            : entry.linkTypeSummary === 'mixed'
                              ? 'Mixed'
                              : 'Standard'}
                        </span>
                      )}
                    </div>
                    {entry.success ? (
                      <>
                        <div className="ns-ping-history-path">
                          {entry.path.map((id) => devices.find((device) => device.id === id)?.name ?? id).join('→')}
                        </div>
                        {entry.linkDetail && (
                          <div className="ns-ping-history-detail">{entry.linkDetail}</div>
                        )}
                        <div className="ns-ping-meta">{Math.round(entry.latencyMs)} ms</div>
                      </>
                    ) : (
                      <div className="ns-ping-meta">{entry.message}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeToolTab === 'arp' && (
          <>
            <AttackField label="Attacker device">
              <select
                value={attackerDeviceId}
                onChange={(event) => setAttackerDeviceId(event.target.value)}
              >
                <option value="">Attacker device</option>
                <DeviceOptions devices={devices} />
              </select>
            </AttackField>

            <AttackField label="Victim device">
              <select value={victimDeviceId} onChange={(event) => setVictimDeviceId(event.target.value)}>
                <option value="">Victim device</option>
                <DeviceOptions devices={devices.filter((device) => canBeVictim(device.type))} />
              </select>
            </AttackField>

            <AttackField label="Impersonated device">
              <select
                value={impersonatedDeviceId}
                onChange={(event) => setImpersonatedDeviceId(event.target.value)}
              >
                <option value="">Impersonated device</option>
                <DeviceOptions devices={devices.filter((device) => canBeImpersonated(device.type))} />
              </select>
            </AttackField>

            <div className="ns-field-group">
              <div className="ns-field-label">Spoofing Mode</div>
              <div className="ns-link-toggle">
                <button
                  type="button"
                  className={`ns-link-toggle-btn ${!arpBidirectional ? 'active' : ''}`}
                  onClick={() => setArpBidirectional(false)}
                >
                  One-way
                </button>
                <button
                  type="button"
                  className={`ns-link-toggle-btn ${arpBidirectional ? 'active' : ''}`}
                  onClick={() => setArpBidirectional(true)}
                >
                  Bidirectional (full MITM)
                </button>
              </div>
            </div>

            <div className="ns-attack-panel-buttons">
              {isArpAttackActive ? (
                <>
                  <span className="ns-attack-status-badge">Active</span>
                  <button
                    type="button"
                    className="ns-attack-btn ns-attack-btn-danger"
                    onClick={handleStopArpSpoof}
                  >
                    Stop Spoofing
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ns-attack-btn ns-attack-btn-primary"
                  onClick={handleTriggerArpSpoof}
                >
                  Trigger ARP Spoof
                </button>
              )}
            </div>
            {arpError && <p className="error-text">{arpError}</p>}
          </>
        )}

        {activeToolTab === 'dns' && (
          <>
            <AttackField label="DNS attacker device">
              <select
                value={dnsAttackerDeviceId}
                onChange={(event) => setDnsAttackerDeviceId(event.target.value)}
              >
                <option value="">DNS attacker device</option>
                <DeviceOptions devices={devices.filter((device) => canBeAttacker(device.type))} />
              </select>
            </AttackField>

            <AttackField label="DNS victim device">
              <select
                value={dnsVictimDeviceId}
                onChange={(event) => setDnsVictimDeviceId(event.target.value)}
              >
                <option value="">DNS victim device</option>
                <DeviceOptions devices={devices.filter((device) => canBeVictim(device.type))} />
              </select>
            </AttackField>

            <AttackField label="Target domain">
              <select value={targetDomain} onChange={(event) => setTargetDomain(event.target.value)}>
                <option value="">Target domain</option>
                {devices
                  .filter((device) => canBeVictim(device.type) && device.id !== dnsVictimDeviceId)
                  .map((device) => (
                    <option key={device.id} value={`${device.name}.local`}>
                      {`${device.name}.local`}
                    </option>
                  ))}
              </select>
            </AttackField>

            <AttackField label="Fake IP">
              <input
                type="text"
                placeholder="Fake IP"
                value={fakeIp}
                onChange={(event) => setFakeIp(event.target.value)}
              />
            </AttackField>

            <div className="ns-attack-panel-buttons">
              {isDnsAttackActive ? (
                <>
                  <span className="ns-attack-status-badge">Active</span>
                  <button
                    type="button"
                    className="ns-attack-btn ns-attack-btn-danger"
                    onClick={handleStopDnsPoison}
                  >
                    Stop DNS Poison
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ns-attack-btn ns-attack-btn-primary"
                  onClick={handleTriggerDnsPoison}
                >
                  Trigger DNS Poison
                </button>
              )}
            </div>
            {dnsError && <p className="error-text">{dnsError}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default AttackPanel;
