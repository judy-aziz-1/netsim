let packetIdCounter = 0;

export function createPacket(sourceNodeId, targetNodeId, path) {
  packetIdCounter += 1;

  return {
    id: `packet-${packetIdCounter}`,
    sourceNodeId,
    targetNodeId,
    path,
    currentSegmentIndex: 0,
    progress: 0,
  };
}

export function advancePacket(packet, deltaTime, speed) {
  const segmentCount = packet.path.length - 1;

  let currentSegmentIndex = packet.currentSegmentIndex;
  let progress = packet.progress + deltaTime * speed;

  while (progress >= 1 && currentSegmentIndex < segmentCount) {
    progress -= 1;
    currentSegmentIndex += 1;
  }

  if (currentSegmentIndex >= segmentCount) {
    currentSegmentIndex = segmentCount;
    progress = 0;
  }

  return {
    ...packet,
    currentSegmentIndex,
    progress,
  };
}

export function isPacketArrived(packet) {
  const segmentCount = packet.path.length - 1;

  return packet.currentSegmentIndex >= segmentCount;
}

export function getPacketPosition(packet, nodePositions) {
  const segmentCount = packet.path.length - 1;

  if (packet.currentSegmentIndex >= segmentCount) {
    const finalNodeId = packet.path[packet.path.length - 1];

    return { ...nodePositions[finalNodeId] };
  }

  const fromNodeId = packet.path[packet.currentSegmentIndex];
  const toNodeId = packet.path[packet.currentSegmentIndex + 1];

  const fromPosition = nodePositions[fromNodeId];
  const toPosition = nodePositions[toNodeId];

  return {
    x: fromPosition.x + (toPosition.x - fromPosition.x) * packet.progress,
    y: fromPosition.y + (toPosition.y - fromPosition.y) * packet.progress,
  };
}
