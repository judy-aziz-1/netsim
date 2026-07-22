import { useEffect, useRef, useState } from 'react';
import { Circle, Group, Image, Line, Rect, Text } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';
import routerIconSrc from '../assets/icons/router.svg';
import switchIconSrc from '../assets/icons/switch.svg';
import pcIconSrc from '../assets/icons/pc.svg';
import firewallIconSrc from '../assets/icons/firewall.svg';
import firewallUnderAttackIconSrc from '../assets/icons/firewall_under_attack.svg';

const COLORS_BY_TYPE = {
  router: 'steelblue',
  switch: 'seagreen',
  pc: 'darkorange',
  firewall: 'firebrick',
  server: 'slategray',
  attacker: '#e74c3c',
};

const ICON_TYPES = ['router', 'switch', 'pc', 'firewall'];
const ICON_SIZE = 40;
const CONNECTING_COLOR = 'gold';
const DELETE_BUTTON_OFFSET = 22;
const UNDER_ATTACK_DURATION_MS = 2500;

function useSvgImage(src) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  return image;
}

function DeviceNode({ device }) {
  const updateDevicePosition = useTopologyStore((state) => state.updateDevicePosition);
  const addLink = useTopologyStore((state) => state.addLink);
  const removeDevice = useTopologyStore((state) => state.removeDevice);
  const connectingFromDeviceId = useTopologyStore((state) => state.connectingFromDeviceId);
  const setConnectingFromDeviceId = useTopologyStore((state) => state.setConnectingFromDeviceId);
  const pendingLinkType = useTopologyStore((state) => state.pendingLinkType);
  const arpAttackLog = useTopologyStore((state) => state.arpAttackLog);
  const dnsAttackLog = useTopologyStore((state) => state.dnsAttackLog);

  const routerIcon = useSvgImage(routerIconSrc);
  const switchIcon = useSvgImage(switchIconSrc);
  const pcIcon = useSvgImage(pcIconSrc);
  const firewallIcon = useSvgImage(firewallIconSrc);
  const firewallUnderAttackIcon = useSvgImage(firewallUnderAttackIconSrc);

  const [isUnderAttack, setIsUnderAttack] = useState(false);
  const attackTimeoutRef = useRef(null);

  useEffect(() => {
    if (device.type !== 'firewall') {
      return;
    }

    const lastArpEntry = arpAttackLog[arpAttackLog.length - 1];
    const lastDnsEntry = dnsAttackLog[dnsAttackLog.length - 1];

    const isTargeted =
      (lastArpEntry && lastArpEntry.victimDeviceId === device.id) ||
      (lastDnsEntry && lastDnsEntry.victimDeviceId === device.id);

    if (!isTargeted) {
      return;
    }

    setIsUnderAttack(true);
    clearTimeout(attackTimeoutRef.current);
    attackTimeoutRef.current = setTimeout(() => {
      setIsUnderAttack(false);
    }, UNDER_ATTACK_DURATION_MS);
  }, [arpAttackLog, dnsAttackLog, device.id, device.type]);

  useEffect(() => () => clearTimeout(attackTimeoutRef.current), []);

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
  if (ICON_TYPES.includes(device.type)) {
    const iconImage =
      device.type === 'firewall'
        ? isUnderAttack
          ? firewallUnderAttackIcon
          : firewallIcon
        : { router: routerIcon, switch: switchIcon, pc: pcIcon }[device.type];

    shape = (
      <Group onClick={handleClick}>
        <Rect
          width={ICON_SIZE}
          height={ICON_SIZE}
          offsetX={ICON_SIZE / 2}
          offsetY={ICON_SIZE / 2}
          fill="transparent"
        />
        {isConnecting && <Circle radius={22} stroke={CONNECTING_COLOR} strokeWidth={3} />}
        {iconImage && (
          <Image
            image={iconImage}
            width={ICON_SIZE}
            height={ICON_SIZE}
            offsetX={ICON_SIZE / 2}
            offsetY={ICON_SIZE / 2}
            listening={false}
          />
        )}
      </Group>
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
