import { Stage, Layer } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';
import DeviceNode from './DeviceNode';
import LinkLine from './LinkLine';

function TopologyCanvas() {
  const devices = useTopologyStore((state) => state.devices);
  const links = useTopologyStore((state) => state.links);

  return (
    <Stage width={800} height={600}>
      <Layer>
        {links.map((link) => (
          <LinkLine key={link.id} link={link} />
        ))}
        {devices.map((device) => (
          <DeviceNode key={device.id} device={device} />
        ))}
      </Layer>
    </Stage>
  );
}

export default TopologyCanvas;
