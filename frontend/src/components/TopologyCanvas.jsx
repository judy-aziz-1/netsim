import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useTopologyStore } from '../store/topologyStore';
import { formatSpeedLabel, getDefaultSpeed } from '../engine/connectionCapabilities';
import { findActivePoisonings } from '../engine/arpSpoofing';
import { findActiveDnsPoisonings } from '../engine/dnsPoisoning';
import DeviceNode from './DeviceNode';
import LinkLine from './LinkLine';
import Packet from './Packet';

function TopologyCanvas({ onOpenDeviceSettings, onOpenLinkSettings }) {
  const devices = useTopologyStore((state) => state.devices);
  const links = useTopologyStore((state) => state.links);
  const activePackets = useTopologyStore((state) => state.activePackets);
  const arpTables = useTopologyStore((state) => state.arpTables);
  const dnsTables = useTopologyStore((state) => state.dnsTables);
  const removeDevice = useTopologyStore((state) => state.removeDevice);
  const removeLink = useTopologyStore((state) => state.removeLink);

  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [hoveredDeviceId, setHoveredDeviceId] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [selection, setSelection] = useState(null);
  const [animTime, setAnimTime] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setStageSize({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Escape') {
        setSelection(null);
        return;
      }

      if (event.key === 'Delete' && selection) {
        if (selection.type === 'device') {
          removeDevice(selection.id);
        } else if (selection.type === 'link') {
          removeLink(selection.id);
        }
        setSelection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, removeDevice, removeLink]);

  const activeSegmentKeys = new Set();
  activePackets.forEach((packet) => {
    const a = packet.path[packet.currentSegmentIndex];
    const b = packet.path[packet.currentSegmentIndex + 1];
    if (a && b) {
      activeSegmentKeys.add(`${a}|${b}`);
      activeSegmentKeys.add(`${b}|${a}`);
    }
  });

  const activeArpPoisonings = findActivePoisonings(devices, links, arpTables);
  const activeDnsPoisonings = findActiveDnsPoisonings(devices, dnsTables);
  const allActivePoisonings = [
    ...activeArpPoisonings.map((poisoning) => ({ ...poisoning, via: 'arp' })),
    ...activeDnsPoisonings.map((poisoning) => ({ ...poisoning, via: 'dns' })),
  ];
  const poisonedDeviceIds = new Set(allActivePoisonings.map((poisoning) => poisoning.victimDeviceId));

  useEffect(() => {
    if (allActivePoisonings.length === 0) {
      return undefined;
    }

    let frame;
    const tick = (time) => {
      setAnimTime(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [allActivePoisonings.length]);

  const pulseOpacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(animTime / 500));
  const dashOffset = -((animTime / 30) % 16);

  const hoveredDevice = devices.find((device) => device.id === hoveredDeviceId) ?? null;

  const handleStageClick = (event) => {
    if (event.target === event.target.getStage()) {
      setSelection(null);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <Stage width={stageSize.width} height={stageSize.height} onClick={handleStageClick}>
        <Layer>
          {links.map((link) => (
            <LinkLine
              key={link.id}
              link={link}
              isActive={activeSegmentKeys.has(`${link.sourceDeviceId}|${link.targetDeviceId}`)}
              isSelected={selection?.type === 'link' && selection.id === link.id}
              isDisabled={link.enabled === false}
              onSelect={(selectedLink) => setSelection({ type: 'link', id: selectedLink.id })}
              onOpenSettings={onOpenLinkSettings}
              onHoverChange={(hoveredLinkArg, midpoint, isHovering) =>
                setHoveredLink(isHovering ? { link: hoveredLinkArg, midpoint } : null)
              }
            />
          ))}
          {allActivePoisonings.map((poisoning) => {
            const attacker = devices.find((device) => device.id === poisoning.attackerDeviceId);
            const victim = devices.find((device) => device.id === poisoning.victimDeviceId);

            if (!attacker || !victim) {
              return null;
            }

            return (
              <Line
                key={`deception-${poisoning.via}-${poisoning.victimDeviceId}-${poisoning.impersonatedDeviceId ?? poisoning.targetDomain}`}
                points={[attacker.x, attacker.y, victim.x, victim.y]}
                stroke="#e74c3c"
                strokeWidth={2}
                dash={[8, 6]}
                dashOffset={dashOffset}
                opacity={0.75}
                listening={false}
              />
            );
          })}
          {devices.map((device) => (
            <DeviceNode
              key={device.id}
              device={device}
              onOpenSettings={onOpenDeviceSettings}
              onHoverChange={(hoveredDeviceArg, isHovering) =>
                setHoveredDeviceId(isHovering ? hoveredDeviceArg.id : null)
              }
              onSelect={(selectedDevice) => setSelection({ type: 'device', id: selectedDevice.id })}
              isSelected={selection?.type === 'device' && selection.id === device.id}
              isPoisoned={poisonedDeviceIds.has(device.id)}
              pulseOpacity={pulseOpacity}
            />
          ))}
          {activePackets.map((packet) => (
            <Packet key={packet.id} packet={packet} />
          ))}
        </Layer>
      </Stage>

      {hoveredDevice && (
        <div
          className="ns-device-tooltip"
          style={{ left: hoveredDevice.x + 28, top: hoveredDevice.y - 20 }}
        >
          <div className="ns-device-tooltip-name">{hoveredDevice.name}</div>
          {hoveredDevice.ip && <div className="ns-device-tooltip-row">IP: {hoveredDevice.ip}</div>}
          <div className="ns-device-tooltip-row">MAC: {hoveredDevice.mac}</div>
        </div>
      )}

      {hoveredLink && (
        <div
          className="ns-link-tooltip"
          style={{ left: hoveredLink.midpoint.x + 12, top: hoveredLink.midpoint.y - 20 }}
        >
          <div className="ns-link-tooltip-name">
            {hoveredLink.link.type === 'backbone' ? 'Backbone' : 'Standard'}
          </div>
          <div className="ns-link-tooltip-row">
            {formatSpeedLabel(hoveredLink.link.speed ?? getDefaultSpeed(hoveredLink.link.type))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TopologyCanvas;
