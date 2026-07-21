import { Line } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';

function LinkLine({ link }) {
  const sourceDevice = useTopologyStore((state) =>
    state.devices.find((device) => device.id === link.sourceDeviceId),
  );
  const targetDevice = useTopologyStore((state) =>
    state.devices.find((device) => device.id === link.targetDeviceId),
  );

  if (!sourceDevice || !targetDevice) {
    return null;
  }

  const isBackbone = link.type === 'backbone';

  return (
    <Line
      points={[sourceDevice.x, sourceDevice.y, targetDevice.x, targetDevice.y]}
      stroke={isBackbone ? '#4d9fff' : '#7d8590'}
      strokeWidth={isBackbone ? 4 : 2}
    />
  );
}

export default LinkLine;
