import { Circle, Rect } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';

const COLORS_BY_TYPE = {
  router: 'steelblue',
  switch: 'seagreen',
  pc: 'darkorange',
};

const CONNECTING_COLOR = 'gold';

function DeviceNode({ device }) {
  const updateDevicePosition = useTopologyStore((state) => state.updateDevicePosition);
  const addLink = useTopologyStore((state) => state.addLink);
  const connectingFromDeviceId = useTopologyStore((state) => state.connectingFromDeviceId);
  const setConnectingFromDeviceId = useTopologyStore((state) => state.setConnectingFromDeviceId);

  const isConnecting = connectingFromDeviceId === device.id;
  const fill = isConnecting ? CONNECTING_COLOR : COLORS_BY_TYPE[device.type] ?? 'gray';

  const handleDragEnd = (event) => {
    updateDevicePosition(device.id, event.target.x(), event.target.y());
  };

  const handleClick = () => {
    if (!connectingFromDeviceId) {
      setConnectingFromDeviceId(device.id);
      return;
    }

    if (connectingFromDeviceId === device.id) {
      setConnectingFromDeviceId(null);
      return;
    }

    addLink(connectingFromDeviceId, device.id);
    setConnectingFromDeviceId(null);
  };

  if (device.type === 'pc') {
    return (
      <Rect
        x={device.x}
        y={device.y}
        width={40}
        height={40}
        offsetX={20}
        offsetY={20}
        fill={fill}
        draggable
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      />
    );
  }

  return (
    <Circle
      x={device.x}
      y={device.y}
      radius={20}
      fill={fill}
      draggable
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    />
  );
}

export default DeviceNode;
