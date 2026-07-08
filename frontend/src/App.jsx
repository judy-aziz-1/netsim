import { useState } from 'react';
import TopologyCanvas from './components/TopologyCanvas';
import { useTopologyStore } from './store/topologyStore';

function App() {
  const addDevice = useTopologyStore((state) => state.addDevice);
  const sendPacket = useTopologyStore((state) => state.sendPacket);
  const devices = useTopologyStore((state) => state.devices);

  const [sourceDeviceId, setSourceDeviceId] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');

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

      <TopologyCanvas />
    </div>
  );
}

export default App;
