import { Circle, Group, Rect, Text } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';

const COLORS_BY_TYPE = {
  router: 'steelblue',
  switch: 'seagreen',
  pc: 'darkorange',
};

const CONNECTING_COLOR = 'gold';
const DELETE_BUTTON_OFFSET = 22;

function DeviceNode({ device }) {
  const updateDevicePosition = useTopologyStore((state) => state.updateDevicePosition);
  const addLink = useTopologyStore((state) => state.addLink);
  const removeDevice = useTopologyStore((state) => state.removeDevice);
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

  const handleDeleteClick = (event) => {
    event.cancelBubble = true;

    if (window.confirm(`Delete device ${device.name}?`)) {
      removeDevice(device.id);
    }
  };

  const shape =
    device.type === 'pc' ? (
      <Rect width={40} height={40} offsetX={20} offsetY={20} fill={fill} onClick={handleClick} />
    ) : (
      <Circle radius={20} fill={fill} onClick={handleClick} />
    );

  return (
    <Group x={device.x} y={device.y} draggable onDragEnd={handleDragEnd}>
      {shape}
      <Circle
        x={DELETE_BUTTON_OFFSET}
        y={-DELETE_BUTTON_OFFSET}
        radius={8}
        fill="crimson"
        onClick={handleDeleteClick}
      />
      <Text
        x={DELETE_BUTTON_OFFSET}
        y={-DELETE_BUTTON_OFFSET}
        text="×"
        fontSize={12}
        fill="white"
        offsetX={4}
        offsetY={7}
        listening={false}
      />
    </Group>
  );
}

export default DeviceNode;
