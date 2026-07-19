import { useState } from 'react';
import TopologyCanvas from './components/TopologyCanvas';
import SiemDashboard from './components/SiemDashboard';
import SocDashboard from './components/SocDashboard';
import AuthForm from './components/AuthForm';
import { useTopologyStore } from './store/topologyStore';
import { useAuthStore } from './store/authStore';
import { logoutUser } from './api/client';

function App() {
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);
  const [activeTab, setActiveTab] = useState('editor');
  const addDevice = useTopologyStore((state) => state.addDevice);
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
    triggerArpSpoof(attackerDeviceId, victimDeviceId, impersonatedDeviceId);

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);
    const impersonated = devices.find((device) => device.id === impersonatedDeviceId);

    alert(
      `victim device ${victim?.name} now believes MAC of attacker ${attacker?.name} belongs to device ${impersonated?.name}`,
    );
  };

  const handleTriggerDnsPoison = () => {
    triggerDnsPoison(dnsAttackerDeviceId, dnsVictimDeviceId, targetDomain, fakeIp);

    const victim = devices.find((device) => device.id === dnsVictimDeviceId);

    alert(`victim device ${victim?.name} now resolves ${targetDomain} to ${fakeIp}`);
  };

  const handleLogout = () => {
    logoutUser(token)
      .catch((error) => console.error('Failed to log out', error))
      .finally(() => setToken(null));
  };

  if (!token) {
    return (
      <div className="app-shell">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="field-row">
        <button className="btn" onClick={handleLogout}>Logout</button>
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
            <TopologyCanvas />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
