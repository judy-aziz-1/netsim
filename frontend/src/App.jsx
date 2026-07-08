import { useState } from 'react';
import TopologyCanvas from './components/TopologyCanvas';
import { useTopologyStore } from './store/topologyStore';

function App() {
  const addDevice = useTopologyStore((state) => state.addDevice);
  const sendPacket = useTopologyStore((state) => state.sendPacket);
  const triggerArpSpoof = useTopologyStore((state) => state.triggerArpSpoof);
  const devices = useTopologyStore((state) => state.devices);

  const [sourceDeviceId, setSourceDeviceId] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');

  const [attackerDeviceId, setAttackerDeviceId] = useState('');
  const [victimDeviceId, setVictimDeviceId] = useState('');
  const [impersonatedDeviceId, setImpersonatedDeviceId] = useState('');

  const handleTriggerArpSpoof = () => {
    triggerArpSpoof(attackerDeviceId, victimDeviceId, impersonatedDeviceId);

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);
    const impersonated = devices.find((device) => device.id === impersonatedDeviceId);

    alert(
      `victim device ${victim?.name} now believes MAC of attacker ${attacker?.name} belongs to device ${impersonated?.name}`,
    );
  };

  return (
    <div>
      <button onClick={() => addDevice('router', 100, 100)}>Add Router</button>

      <select value={sourceDeviceId} onChange={(event) => setSourceDeviceId(event.target.value)}>
        <option value="">Source device</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name}
          </option>
        ))}
      </select>

      <select value={targetDeviceId} onChange={(event) => setTargetDeviceId(event.target.value)}>
        <option value="">Target device</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name}
          </option>
        ))}
      </select>

      <button onClick={() => sendPacket(sourceDeviceId, targetDeviceId)}>Send Test Packet</button>

      <select value={attackerDeviceId} onChange={(event) => setAttackerDeviceId(event.target.value)}>
        <option value="">Attacker device</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name}
          </option>
        ))}
      </select>

      <select value={victimDeviceId} onChange={(event) => setVictimDeviceId(event.target.value)}>
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

      <button onClick={handleTriggerArpSpoof}>Trigger ARP Spoof</button>

      <TopologyCanvas />
    </div>
  );
}

export default App;
