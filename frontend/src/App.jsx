import { useState } from 'react';
import TopologyCanvas from './components/TopologyCanvas';
import SiemDashboard from './components/SiemDashboard';
import SocDashboard from './components/SocDashboard';
import DeviceSettingsPanel from './components/DeviceSettingsPanel';
import { useTopologyStore } from './store/topologyStore';

function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const addDevice = useTopologyStore((state) => state.addDevice);
  const pendingLinkType = useTopologyStore((state) => state.pendingLinkType);
  const setPendingLinkType = useTopologyStore((state) => state.setPendingLinkType);
  const sendPacket = useTopologyStore((state) => state.sendPacket);
  const triggerArpSpoof = useTopologyStore((state) => state.triggerArpSpoof);
  const triggerDnsPoison = useTopologyStore((state) => state.triggerDnsPoison);
  const devices = useTopologyStore((state) => state.devices);

  const [sourceDeviceId, setSourceDeviceId] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');

  const [attackerDeviceId, setAttackerDeviceId] = useState('');
  const [victimDeviceId, setVictimDeviceId] = useState('');
  const [impersonatedDeviceId, setImpersonatedDeviceId] = useState('');

  const [dnsAttackerDeviceId, setDnsAttackerDeviceId] = useState('');
  const [dnsVictimDeviceId, setDnsVictimDeviceId] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [fakeIp, setFakeIp] = useState('');

  const handleTriggerArpSpoof = () => {
    const result = triggerArpSpoof(attackerDeviceId, victimDeviceId, impersonatedDeviceId);

    if (!result?.success) {
      alert(result?.reason ?? 'Cannot trigger ARP spoof');
      return;
    }

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);
    const impersonated = devices.find((device) => device.id === impersonatedDeviceId);

    alert(
      `victim device ${victim?.name} now believes MAC of attacker ${attacker?.name} belongs to device ${impersonated?.name}`,
    );
  };

  const handleTriggerDnsPoison = () => {
    const result = triggerDnsPoison(dnsAttackerDeviceId, dnsVictimDeviceId, targetDomain, fakeIp);

    if (!result?.success) {
      alert(result?.reason ?? 'Cannot trigger DNS poison');
      return;
    }

    const victim = devices.find((device) => device.id === dnsVictimDeviceId);

    alert(`victim device ${victim?.name} now resolves ${targetDomain} to ${fakeIp}`);
  };

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1 className="app-title">NetSim</h1>
        <span className="app-subtitle">SIEM / SOC Network Simulator</span>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          Network Editor
        </button>
        <button
          className={`tab-button ${activeTab === 'siem' ? 'active' : ''}`}
          onClick={() => setActiveTab('siem')}
        >
          SIEM Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'soc' ? 'active' : ''}`}
          onClick={() => setActiveTab('soc')}
        >
          SOC Tickets
        </button>
      </div>

      {activeTab === 'siem' && <SiemDashboard />}
      {activeTab === 'soc' && <SocDashboard />}

      {activeTab === 'editor' && (
        <div>
          <div className="section">
            <h2>Devices</h2>
            <div className="field-row">
              <button className="btn" onClick={() => addDevice('router', 100, 100)}>
                Add Router
              </button>
              <button className="btn" onClick={() => addDevice('pc', 200, 100)}>
                Add PC
              </button>
              <button className="btn" onClick={() => addDevice('switch', 300, 100)}>
                Add Switch
              </button>
              <button className="btn" onClick={() => addDevice('firewall', 400, 100)}>
                Add Firewall
              </button>
              <button className="btn" onClick={() => addDevice('server', 500, 100)}>
                Add Server
              </button>
              <button className="btn" onClick={() => addDevice('attacker', 600, 100)}>
                Add Attacker
              </button>
            </div>
          </div>

          <div className="section">
            <h2>Link Type</h2>
            <div className="field-row">
              <span className="hint-text">
                Next link: <span className="hint-value">
                  {pendingLinkType === 'backbone' ? 'Backbone' : 'Standard'}
                </span>
              </span>
              <button
                className="btn"
                onClick={() =>
                  setPendingLinkType(pendingLinkType === 'backbone' ? 'standard' : 'backbone')
                }
              >
                Toggle Link Type
              </button>
            </div>
          </div>

          <div className="section">
            <h2>Send Packet</h2>
            <div className="field-row">
              <select
                value={sourceDeviceId}
                onChange={(event) => setSourceDeviceId(event.target.value)}
              >
                <option value="">Source device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <select
                value={targetDeviceId}
                onChange={(event) => setTargetDeviceId(event.target.value)}
              >
                <option value="">Target device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <button className="btn" onClick={() => sendPacket(sourceDeviceId, targetDeviceId)}>
                Send Test Packet
              </button>
            </div>
          </div>

          <div className="section">
            <h2>ARP Attack</h2>
            <div className="field-row">
              <select
                value={attackerDeviceId}
                onChange={(event) => setAttackerDeviceId(event.target.value)}
              >
                <option value="">Attacker device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <select
                value={victimDeviceId}
                onChange={(event) => setVictimDeviceId(event.target.value)}
              >
                <option value="">Victim device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <select
                value={impersonatedDeviceId}
                onChange={(event) => setImpersonatedDeviceId(event.target.value)}
              >
                <option value="">Impersonated device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <button className="btn" onClick={handleTriggerArpSpoof}>
                Trigger ARP Spoof
              </button>
            </div>
          </div>

          <div className="section">
            <h2>DNS Attack</h2>
            <div className="field-row">
              <select
                value={dnsAttackerDeviceId}
                onChange={(event) => setDnsAttackerDeviceId(event.target.value)}
              >
                <option value="">DNS attacker device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <select
                value={dnsVictimDeviceId}
                onChange={(event) => setDnsVictimDeviceId(event.target.value)}
              >
                <option value="">DNS victim device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Target domain"
                value={targetDomain}
                onChange={(event) => setTargetDomain(event.target.value)}
              />

              <input
                type="text"
                placeholder="Fake IP"
                value={fakeIp}
                onChange={(event) => setFakeIp(event.target.value)}
              />

              <button className="btn" onClick={handleTriggerDnsPoison}>
                Trigger DNS Poison
              </button>
            </div>
          </div>

          <div className="canvas-frame">
            <TopologyCanvas onOpenDeviceSettings={(device) => setSelectedDeviceId(device.id)} />
          </div>
        </div>
      )}

      {selectedDevice && (
        <DeviceSettingsPanel
          device={selectedDevice}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}
    </div>
  );
}

export default App;
