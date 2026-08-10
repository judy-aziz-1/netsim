import { useEffect, useRef } from 'react';
import { Line } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';

const DOUBLE_CLICK_THRESHOLD_MS = 300;

function LinkLine({ link, isActive, isSelected, isDisabled, onSelect, onOpenSettings, onHoverChange }) {
  const sourceDevice = useTopologyStore((state) =>
    state.devices.find((device) => device.id === link.sourceDeviceId),
  );
  const targetDevice = useTopologyStore((state) =>
    state.devices.find((device) => device.id === link.targetDeviceId),
  );

  const pendingClickTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(pendingClickTimeoutRef.current), []);

  if (!sourceDevice || !targetDevice) {
    return null;
  }

  const isBackbone = link.type === 'backbone';
  const points = [sourceDevice.x, sourceDevice.y, targetDevice.x, targetDevice.y];
  const baseStrokeWidth = isBackbone ? 4 : 2;
  const midpoint = { x: (sourceDevice.x + targetDevice.x) / 2, y: (sourceDevice.y + targetDevice.y) / 2 };

  // Same manual double-click detection used in DeviceNode.jsx, for
  // consistency and to avoid Konva's native dblclick reliability issues.
  const handleClick = () => {
    if (pendingClickTimeoutRef.current) {
      clearTimeout(pendingClickTimeoutRef.current);
      pendingClickTimeoutRef.current = null;
      onOpenSettings?.(link);
      return;
    }

    pendingClickTimeoutRef.current = setTimeout(() => {
      pendingClickTimeoutRef.current = null;
      onSelect?.(link);
    }, DOUBLE_CLICK_THRESHOLD_MS);
  };

  return (
    <>
      {isSelected && (
        <Line
          points={points}
          stroke="#4d9fff"
          strokeWidth={baseStrokeWidth + 10}
          opacity={0.3}
          lineCap="round"
        />
      )}
      {isActive && (
        <Line
          points={points}
          stroke="#22c55e"
          strokeWidth={baseStrokeWidth + 6}
          opacity={0.35}
          lineCap="round"
          shadowColor="#22c55e"
          shadowBlur={14}
          shadowOpacity={0.9}
        />
      )}
      <Line
        points={points}
        stroke={isDisabled ? '#e74c3c' : isBackbone ? '#4d9fff' : '#5a6478'}
        strokeWidth={baseStrokeWidth}
        hitStrokeWidth={16}
        onClick={handleClick}
        onMouseEnter={() => onHoverChange?.(link, midpoint, true)}
        onMouseLeave={() => onHoverChange?.(link, midpoint, false)}
      />
    </>
  );
}

export default LinkLine;
