import { Stage, Layer } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';
import DeviceNode from './DeviceNode';
import LinkLine from './LinkLine';
import Packet from './Packet';

function TopologyCanvas() {
  const devices = useTopologyStore((state) => state.devices);
  const links = useTopologyStore((state) => state.links);
  const activePackets = useTopologyStore((state) => state.activePackets);

  return (
    <Stage width={800} height={600}>
      <Layer>
        {links.map((link) => (
          <LinkLine key={link.id} link={link} />
        ))}
        {devices.map((device) => (
          <DeviceNode key={device.id} device={device} />
        ))}
        {activePackets.map((packet) => (
          <Packet key={packet.id} packet={packet} />
        ))}
      </Layer>
    </Stage>
  );
}

export default TopologyCanvas;
