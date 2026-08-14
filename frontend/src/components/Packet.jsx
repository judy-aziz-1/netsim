import { useEffect, useRef, useState } from 'react';
import { Circle } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';
import { advancePacket, isPacketArrived, getPacketPosition } from '../engine/packetMovement';
import { getSpeedMultiplier } from '../engine/connectionCapabilities';

const PACKET_SPEED = 0.7;

function Packet({ packet }) {
  const devices = useTopologyStore((state) => state.devices);
  const updatePacketState = useTopologyStore((state) => state.updatePacketState);
  const removePacket = useTopologyStore((state) => state.removePacket);
  const registerDosPacketArrival = useTopologyStore((state) => state.registerDosPacketArrival);

  const packetRef = useRef(packet);
  const lastTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  const nodePositions = {};
  devices.forEach((device) => {
    nodePositions[device.id] = { x: device.x, y: device.y };
  });

  const [position, setPosition] = useState(() => getPacketPosition(packet, nodePositions));

  useEffect(() => {
    packetRef.current = packet;
  }, [packet]);

  useEffect(() => {
    const tick = (time) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const currentPacket = packetRef.current;

      const segmentSourceId = currentPacket.path[currentPacket.currentSegmentIndex];
      const segmentTargetId = currentPacket.path[currentPacket.currentSegmentIndex + 1];
      const segmentLink = useTopologyStore
        .getState()
        .links.find(
          (candidate) =>
            (candidate.sourceDeviceId === segmentSourceId && candidate.targetDeviceId === segmentTargetId) ||
            (candidate.sourceDeviceId === segmentTargetId && candidate.targetDeviceId === segmentSourceId),
        );
      const speed = PACKET_SPEED * getSpeedMultiplier(segmentLink?.type ?? 'standard');

      const advanced = advancePacket(currentPacket, deltaTime, speed);

      const currentNodePositions = {};
      useTopologyStore.getState().devices.forEach((device) => {
        currentNodePositions[device.id] = { x: device.x, y: device.y };
      });

      setPosition(getPacketPosition(advanced, currentNodePositions));
      updatePacketState(advanced.id, advanced);

      if (isPacketArrived(advanced)) {
        removePacket(advanced.id);
        if (advanced.isDosFlood) {
          registerDosPacketArrival(advanced.targetNodeId);
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  return <Circle x={position.x} y={position.y} radius={6} fill="crimson" />;
}

export default Packet;
