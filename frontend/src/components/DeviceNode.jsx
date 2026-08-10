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
const DOUBLE_CLICK_THRESHOLD_MS = 300;
const LABEL_OFFSET_Y_BY_TYPE = {
  server: 34,
};
const DEFAULT_LABEL_OFFSET_Y = 28;

function useSvgImage(src) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  return image;
}

function DeviceNode({ device, onOpenSettings, onHoverChange, onSelect, isSelected, isPoisoned, pulseOpacity }) {
  const updateDevicePosition = useTopologyStore((state) => state.updateDevicePosition);
  const addLink = useTopologyStore((state) => state.addLink);
  const removeDevice = useTopologyStore((state) => state.removeDevice);
  const pushToast = useTopologyStore((state) => state.pushToast);
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
  const pendingClickTimeoutRef = useRef(null);

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

  useEffect(
    () => () => {
      clearTimeout(attackTimeoutRef.current);
      clearTimeout(pendingClickTimeoutRef.current);
    },
    [],
  );

  const isConnecting = connectingFromDeviceId === device.id;
  const fill = isConnecting ? CONNECTING_COLOR : COLORS_BY_TYPE[device.type] ?? 'gray';

  const handleDragEnd = (event) => {
    updateDevicePosition(device.id, event.target.x(), event.target.y());
  };

  const performConnectClick = () => {
    if (!connectingFromDeviceId) {
      setConnectingFromDeviceId(device.id);
      onSelect?.(device);
      return;
    }

    if (connectingFromDeviceId === device.id) {
      setConnectingFromDeviceId(null);
      onSelect?.(device);
      return;
    }

    const result = addLink(connectingFromDeviceId, device.id, pendingLinkType);
    setConnectingFromDeviceId(null);
    onSelect?.(device);

    if (!result?.success) {
      pushToast(result?.reason ?? 'Cannot add link', 'error');
    }
  };

  // Manual double-click detection (instead of Konva's native onDblClick):
  // the connecting-mode ring below mounts/unmounts a Konva node between the
  // two clicks of a native dblclick gesture on icon-type devices, which was
  // unreliably breaking Konva/browser double-click recognition for those
  // types only. Debouncing here works identically and uniformly for all
  // device types regardless of what their shape renders.
  const handleShapeClick = () => {
    if (pendingClickTimeoutRef.current) {
      clearTimeout(pendingClickTimeoutRef.current);
      pendingClickTimeoutRef.current = null;
      onOpenSettings?.(device);
      return;
    }

    pendingClickTimeoutRef.current = setTimeout(() => {
      pendingClickTimeoutRef.current = null;
      performConnectClick();
    }, DOUBLE_CLICK_THRESHOLD_MS);
  };

  const handleDeleteClick = (event) => {
    event.cancelBubble = true;

    if (window.confirm(`Delete device ${device.name}?`)) {
      removeDevice(device.id);
    }
  };

  const handleMouseEnter = () => {
    onHoverChange?.(device, true);
  };

  const handleMouseLeave = () => {
    onHoverChange?.(device, false);
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
      <Group onClick={handleShapeClick}>
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
      <Group onClick={handleShapeClick}>
        <Rect width={36} height={48} offsetX={18} offsetY={24} fill={fill} />
        <Line points={[-14, -12, 14, -12]} stroke="white" strokeWidth={2} />
        <Line points={[-14, 0, 14, 0]} stroke="white" strokeWidth={2} />
        <Line points={[-14, 12, 14, 12]} stroke="white" strokeWidth={2} />
      </Group>
    );
  } else if (device.type === 'attacker') {
    shape = (
      <Group onClick={handleShapeClick}>
        <Line points={[-15, 20, 15, 20, 0, -6]} closed fill={fill} />
        <Circle y={-14} radius={9} fill={fill} />
      </Group>
    );
  } else {
    shape = <Circle radius={20} fill={fill} onClick={handleShapeClick} />;
  }

  const labelOffsetY = LABEL_OFFSET_Y_BY_TYPE[device.type] ?? DEFAULT_LABEL_OFFSET_Y;

  return (
    <Group
      x={device.x}
      y={device.y}
      draggable
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {shape}
      {isSelected && <Circle radius={26} stroke="#4d9fff" strokeWidth={2} listening={false} />}
      {isPoisoned && (
        <Circle radius={30} stroke="#e74c3c" strokeWidth={3} opacity={pulseOpacity} listening={false} />
      )}
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
      <Text
        y={labelOffsetY}
        text={device.name}
        fontSize={11}
        fill="#3a4257"
        align="center"
        width={80}
        offsetX={40}
        listening={false}
      />
    </Group>
  );
}

export default DeviceNode;
