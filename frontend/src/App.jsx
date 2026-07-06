import TopologyCanvas from './components/TopologyCanvas';
import { useTopologyStore } from './store/topologyStore';

function App() {
  const addDevice = useTopologyStore((state) => state.addDevice);

  return (
    <div>
      <button onClick={() => addDevice('router', 100, 100)}>Add Router</button>
      <TopologyCanvas />
    </div>
  );
}

export default App;
