import { describe, expect, it } from 'vitest';
import { advancePacket, createPacket, getPacketPosition, isPacketArrived } from './packetMovement';

describe('createPacket', () => {
  it('returns initial packet state', () => {
    const packet = createPacket('node-a', 'node-b', ['node-a', 'node-b']);

    expect(packet.sourceNodeId).toBe('node-a');
    expect(packet.targetNodeId).toBe('node-b');
    expect(packet.path).toEqual(['node-a', 'node-b']);
    expect(packet.currentSegmentIndex).toBe(0);
    expect(packet.progress).toBe(0);
    expect(packet.id).toBeDefined();
  });
});

describe('advancePacket', () => {
  it('advances progress within the same segment', () => {
    const packet = createPacket('a', 'b', ['a', 'b']);
    const advanced = advancePacket(packet, 0.5, 1);

    expect(advanced.currentSegmentIndex).toBe(0);
    expect(advanced.progress).toBe(0.5);
  });

  it('moves to the next segment when progress overflows', () => {
    const packet = createPacket('a', 'b', ['a', 'b', 'c']);
    const advanced = advancePacket(packet, 1.3, 1);

    expect(advanced.currentSegmentIndex).toBe(1);
    expect(advanced.progress).toBeCloseTo(0.3);
  });

  it('clamps at the final segment when path is fully traversed', () => {
    const packet = createPacket('a', 'b', ['a', 'b']);
    const advanced = advancePacket(packet, 5, 1);

    expect(advanced.currentSegmentIndex).toBe(1);
    expect(advanced.progress).toBe(0);
  });

  it('does not mutate the original packet', () => {
    const packet = createPacket('a', 'b', ['a', 'b', 'c']);
    const snapshot = { ...packet };

    advancePacket(packet, 0.9, 1);

    expect(packet).toEqual(snapshot);
  });
});

describe('isPacketArrived', () => {
  it('returns false when segments remain', () => {
    const packet = createPacket('a', 'b', ['a', 'b', 'c']);

    expect(isPacketArrived(packet)).toBe(false);
  });

  it('returns true when the packet reached the last segment', () => {
    const packet = { ...createPacket('a', 'b', ['a', 'b']), currentSegmentIndex: 1 };

    expect(isPacketArrived(packet)).toBe(true);
  });
});

describe('getPacketPosition', () => {
  const nodePositions = {
    a: { x: 0, y: 0 },
    b: { x: 100, y: 200 },
  };

  it('returns the start position at progress 0', () => {
    const packet = { ...createPacket('a', 'b', ['a', 'b']), progress: 0 };

    expect(getPacketPosition(packet, nodePositions)).toEqual({ x: 0, y: 0 });
  });

  it('interpolates the midpoint at progress 0.5', () => {
    const packet = { ...createPacket('a', 'b', ['a', 'b']), progress: 0.5 };

    expect(getPacketPosition(packet, nodePositions)).toEqual({ x: 50, y: 100 });
  });

  it('returns the end position at progress 1', () => {
    const packet = { ...createPacket('a', 'b', ['a', 'b']), progress: 1 };

    expect(getPacketPosition(packet, nodePositions)).toEqual({ x: 100, y: 200 });
  });

  it('returns the final node position once arrived', () => {
    const packet = { ...createPacket('a', 'b', ['a', 'b']), currentSegmentIndex: 1, progress: 0 };

    expect(getPacketPosition(packet, nodePositions)).toEqual({ x: 100, y: 200 });
  });
});
