import { useTopologyStore } from '../store/topologyStore';

function DeviceSidebar({ isOpen }) {
  const addDevice = useTopologyStore((state) => state.addDevice);

  return (
    <div className={`device-sidebar${isOpen ? '' : ' device-sidebar-collapsed'}`}>
      <div className="device-sidebar-inner">
        <h2>Devices</h2>
        <div className="field-row device-sidebar-buttons">
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
    </div>
  );
}

export default DeviceSidebar;
