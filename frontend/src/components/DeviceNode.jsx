import { Circle, Group, Line, RegularPolygon, Rect, Text } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';

const COLORS_BY_TYPE = {
  router: 'steelblue',
  switch: 'seagreen',
  pc: 'darkorange',
  firewall: 'firebrick',
  server: 'slategray',
  attacker: '#e74c3c',
};

const CONNECTING_COLOR = 'gold';
const DELETE_BUTTON_OFFSET = 22;

function DeviceNode({ device }) {
  const updateDevicePosition = useTopologyStore((state) => state.updateDevicePosition);
  const addLink = useTopologyStore((state) => state.addLink);
  const removeDevice = useTopologyStore((state) => state.removeDevice);
  const connectingFromDeviceId = useTopologyStore((state) => state.connectingFromDeviceId);
  const setConnectingFromDeviceId = useTopologyStore((state) => state.setConnectingFromDeviceId);
  const pendingLinkType = useTopologyStore((state) => state.pendingLinkType);

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

    const result = addLink(connectingFromDeviceId, device.id, pendingLinkType);
    setConnectingFromDeviceId(null);

    if (!result?.success) {
      alert(result?.reason ?? 'Cannot add link');
    }
  };

  const handleDeleteClick = (event) => {
    event.cancelBubble = true;

    if (window.confirm(`Delete device ${device.name}?`)) {
      removeDevice(device.id);
    }
  };

  let shape;
  if (device.type === 'pc') {
    shape = (
      <Rect width={40} height={40} offsetX={20} offsetY={20} fill={fill} onClick={handleClick} />
    );
  } else if (device.type === 'switch') {
    shape = (
      <Group onClick={handleClick}>
        <Rect width={50} height={30} offsetX={25} offsetY={15} fill={fill} />
        <Line points={[-15, 8, -15, 15]} stroke="white" strokeWidth={2} />
        <Line points={[-5, 8, -5, 15]} stroke="white" strokeWidth={2} />
        <Line points={[5, 8, 5, 15]} stroke="white" strokeWidth={2} />
        <Line points={[15, 8, 15, 15]} stroke="white" strokeWidth={2} />
      </Group>
    );
  } else if (device.type === 'firewall') {
    shape = (
      <RegularPolygon
        sides={4}
        radius={24}
        rotation={45}
        fill={fill}
        onClick={handleClick}
      />
    );
  } else if (device.type === 'server') {
    shape = (
      <Group onClick={handleClick}>
        <Rect width={36} height={48} offsetX={18} offsetY={24} fill={fill} />
        <Line points={[-14, -12, 14, -12]} stroke="white" strokeWidth={2} />
        <Line points={[-14, 0, 14, 0]} stroke="white" strokeWidth={2} />
        <Line points={[-14, 12, 14, 12]} stroke="white" strokeWidth={2} />
      </Group>
    );
  } else if (device.type === 'attacker') {
    shape = (
      <Group onClick={handleClick}>
        <Line points={[-15, 20, 15, 20, 0, -6]} closed fill={fill} />
        <Circle y={-14} radius={9} fill={fill} />
      </Group>
    );
  } else {
    shape = <Circle radius={20} fill={fill} onClick={handleClick} />;
  }

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
