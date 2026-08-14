import { useEffect, useState } from 'react';
import TopologyCanvas from './components/TopologyCanvas';
import SiemDashboard from './components/SiemDashboard';
import SocDashboard from './components/SocDashboard';
import DeviceSettingsPanel from './components/DeviceSettingsPanel';
import SwitchMacTablePanel from './components/SwitchMacTablePanel';
import LinkSettingsPanel from './components/LinkSettingsPanel';
import DeviceSidebar from './components/DeviceSidebar';
import AttackPanel from './components/AttackPanel';
import ToastContainer from './components/ToastContainer';
import SaveTopologyPanel from './components/SaveTopologyPanel';
import LoadTopologyPanel from './components/LoadTopologyPanel';
import { useTopologyStore } from './store/topologyStore';
import { findActivePoisonings, buildArpSpoofToastMessage } from './engine/arpSpoofing';
import { findActiveDnsPoisonings, buildDnsPoisonToastMessage } from './engine/dnsPoisoning';
import { canBeVictim } from './engine/attackRoles';

function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [showSaveTopology, setShowSaveTopology] = useState(false);
  const [showLoadTopology, setShowLoadTopology] = useState(false);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const pendingLinkType = useTopologyStore((state) => state.pendingLinkType);
  const setPendingLinkType = useTopologyStore((state) => state.setPendingLinkType);
  const pingDevice = useTopologyStore((state) => state.pingDevice);
  const triggerArpSpoof = useTopologyStore((state) => state.triggerArpSpoof);
  const stopArpSpoof = useTopologyStore((state) => state.stopArpSpoof);
  const triggerDnsPoison = useTopologyStore((state) => state.triggerDnsPoison);
  const stopDnsPoison = useTopologyStore((state) => state.stopDnsPoison);
  const pushToast = useTopologyStore((state) => state.pushToast);
  const devices = useTopologyStore((state) => state.devices);
  const links = useTopologyStore((state) => state.links);
  const arpTables = useTopologyStore((state) => state.arpTables);
  const dnsTables = useTopologyStore((state) => state.dnsTables);
  const activePackets = useTopologyStore((state) => state.activePackets);

  const [sourceDeviceId, setSourceDeviceId] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [pingResult, setPingResult] = useState(null);
  const [pendingPing, setPendingPing] = useState(null);
  const [pingHistory, setPingHistory] = useState([]);

  const [attackerDeviceId, setAttackerDeviceId] = useState('');
  const [victimDeviceId, setVictimDeviceId] = useState('');
  const [impersonatedDeviceId, setImpersonatedDeviceId] = useState('');
  const [arpError, setArpError] = useState(null);
  const [arpBidirectional, setArpBidirectional] = useState(false);

  const [dnsAttackerDeviceId, setDnsAttackerDeviceId] = useState('');
  const [dnsVictimDeviceId, setDnsVictimDeviceId] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [fakeIp, setFakeIp] = useState('');
  const [dnsError, setDnsError] = useState(null);

  const handleTriggerArpSpoof = () => {
    const result = triggerArpSpoof(attackerDeviceId, victimDeviceId, impersonatedDeviceId, arpBidirectional);

    if (!result?.success) {
      setArpError(result?.reason ?? 'Cannot trigger ARP spoof');
      return;
    }

    setArpError(null);

    const attacker = devices.find((device) => device.id === attackerDeviceId);
    const victim = devices.find((device) => device.id === victimDeviceId);
    const impersonated = devices.find((device) => device.id === impersonatedDeviceId);

    const { message, type } = buildArpSpoofToastMessage({
      bidirectional: arpBidirectional,
      forwardBlocked: result.forwardBlocked,
      reverseBlocked: result.reverseBlocked,
      attackerName: attacker?.name,
      victimName: victim?.name,
      impersonatedName: impersonated?.name,
    });

    pushToast(message, type);
  };

  const handleStopArpSpoof = () => {
    const result = stopArpSpoof(victimDeviceId, impersonatedDeviceId);

    if (!result?.success) {
      setArpError(result?.reason ?? 'Cannot stop ARP spoof');
      return;
    }

    setArpError(null);
  };

  const activePoisonings = findActivePoisonings(devices, links, arpTables);

  const isArpAttackActive = activePoisonings.some(
    (poisoning) =>
      (poisoning.victimDeviceId === victimDeviceId && poisoning.impersonatedDeviceId === impersonatedDeviceId) ||
      (poisoning.victimDeviceId === impersonatedDeviceId && poisoning.impersonatedDeviceId === victimDeviceId),
  );

  const handleTriggerDnsPoison = () => {
    const result = triggerDnsPoison(dnsAttackerDeviceId, dnsVictimDeviceId, targetDomain, fakeIp);

    if (!result?.success) {
      setDnsError(result?.reason ?? 'Cannot trigger DNS poison');
      return;
    }

    setDnsError(null);

    const victim = devices.find((device) => device.id === dnsVictimDeviceId);

    const { message, type } = buildDnsPoisonToastMessage({
      blocked: result.blocked,
      victimName: victim?.name,
      targetDomain,
      fakeIp,
    });

    pushToast(message, type);
  };

  const handleStopDnsPoison = () => {
    const result = stopDnsPoison(dnsVictimDeviceId, targetDomain);

    if (!result?.success) {
      setDnsError(result?.reason ?? 'Cannot stop DNS poison');
      return;
    }

    setDnsError(null);
  };

  const activeDnsPoisonings = findActiveDnsPoisonings(devices, dnsTables);

  const isDnsAttackActive = activeDnsPoisonings.some(
    (poisoning) => poisoning.victimDeviceId === dnsVictimDeviceId && poisoning.targetDomain === targetDomain,
  );

  const pushPingHistory = (entry) => {
    setPingHistory((prev) => [{ id: `ping-${Date.now()}-${Math.random()}`, ...entry }, ...prev].slice(0, 3));
  };

  const handlePing = () => {
    const result = pingDevice(sourceDeviceId, targetDeviceId);

    if (!result.success) {
      setPendingPing(null);
      const failure = { success: false, message: result.message ?? 'Ping failed' };
      setPingResult(failure);
      pushPingHistory(failure);
      return;
    }

    setPingResult(null);
    setPendingPing({
      packetId: result.packetId,
      path: result.path,
      hops: result.hops,
      latencyMs: result.latencyMs,
      mitm: result.mitm,
      linkTypeSummary: result.linkTypeSummary,
      linkDetail: result.linkDetail,
    });
  };

  useEffect(() => {
    if (!pendingPing) return;

    const stillActive = activePackets.some((packet) => packet.id === pendingPing.packetId);

    if (!stillActive) {
      const finalResult = {
        success: true,
        path: pendingPing.path,
        hops: pendingPing.hops,
        latencyMs: pendingPing.latencyMs,
        mitm: pendingPing.mitm,
        linkTypeSummary: pendingPing.linkTypeSummary,
        linkDetail: pendingPing.linkDetail,
      };
      setPingResult(finalResult);
      pushPingHistory(finalResult);
      setPendingPing(null);
    }
  }, [activePackets, pendingPing]);

  useEffect(() => {
    if (!targetDomain) return;

    const stillValid = devices.some(
      (device) =>
        canBeVictim(device.type) &&
        device.id !== dnsVictimDeviceId &&
        `${device.name}.local` === targetDomain,
    );

    if (!stillValid) {
      setTargetDomain('');
    }
  }, [devices, dnsVictimDeviceId, targetDomain]);

  const handleLeaveToLevelList = () => {
    const target = 'http://localhost:8080';
    if (window.top && window.top !== window.self) {
      window.top.location.href = target;
    } else {
      window.location.href = target;
    }
  };

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;
  const selectedLink = links.find((link) => link.id === selectedLinkId) ?? null;

  return (
    <div className="app-shell">
      <ToastContainer />
      <div className="app-header-bar">
        <div className="app-header-row">
          <div className="app-logo">
            <span className="app-logo-mark">N</span>
          </div>
          <div className="app-title-center">NetSim Simulation</div>
          <div className="app-status-group">
            <div className="app-status-pill">
              <span className="app-status-dot" />
              <span>Simulation Idle</span>
            </div>
            <div className="app-avatar">AR</div>
          </div>
        </div>

        <div className="app-tabs-row">
          <button
            className="leave-app-button"
            onClick={handleLeaveToLevelList}
            title="Leave this app and return to the base site's level list"
          >
            <span aria-hidden="true">&#8592;</span> Level List
          </button>
          <button
            className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Network Editor
          </button>
          <button
            className={`tab-button ${activeTab === 'siem' ? 'active' : ''}`}
            onClick={() => setActiveTab('siem')}
          >
            SIEM Dashboard
            {openAlertsCount > 0 && <span className="tab-badge">{openAlertsCount}</span>}
          </button>
          <button
            className={`tab-button ${activeTab === 'soc' ? 'active' : ''}`}
            onClick={() => setActiveTab('soc')}
          >
            SOC Tickets
            {openTicketsCount > 0 && <span className="tab-badge">{openTicketsCount}</span>}
          </button>
        </div>
      </div>

      {activeTab === 'siem' && (
        <div className="app-content-scroll">
          <SiemDashboard onCountUpdate={setOpenAlertsCount} />
        </div>
      )}
      {activeTab === 'soc' && (
        <div className="app-content-scroll">
          <SocDashboard onCountUpdate={setOpenTicketsCount} />
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="ns-editor-body">
          <DeviceSidebar
            onOpenSaveTopology={() => setShowSaveTopology(true)}
            onOpenLoadTopology={() => setShowLoadTopology(true)}
          />

          <div className="ns-canvas-wrap">
            <div className="ns-canvas-grid" />
            <TopologyCanvas
              onOpenDeviceSettings={(device) => setSelectedDeviceId(device.id)}
              onOpenLinkSettings={(link) => setSelectedLinkId(link.id)}
            />
          </div>

          <AttackPanel
            devices={devices}
            pendingLinkType={pendingLinkType}
            setPendingLinkType={setPendingLinkType}
            sourceDeviceId={sourceDeviceId}
            setSourceDeviceId={setSourceDeviceId}
            targetDeviceId={targetDeviceId}
            setTargetDeviceId={setTargetDeviceId}
            handlePing={handlePing}
            pingResult={pingResult}
            pingHistory={pingHistory}
            attackerDeviceId={attackerDeviceId}
            setAttackerDeviceId={setAttackerDeviceId}
            victimDeviceId={victimDeviceId}
            setVictimDeviceId={setVictimDeviceId}
            impersonatedDeviceId={impersonatedDeviceId}
            setImpersonatedDeviceId={setImpersonatedDeviceId}
            handleTriggerArpSpoof={handleTriggerArpSpoof}
            arpError={arpError}
            isArpAttackActive={isArpAttackActive}
            activePoisoningCount={activePoisonings.length + activeDnsPoisonings.length}
            arpBidirectional={arpBidirectional}
            setArpBidirectional={setArpBidirectional}
            handleStopArpSpoof={handleStopArpSpoof}
            dnsAttackerDeviceId={dnsAttackerDeviceId}
            setDnsAttackerDeviceId={setDnsAttackerDeviceId}
            dnsVictimDeviceId={dnsVictimDeviceId}
            setDnsVictimDeviceId={setDnsVictimDeviceId}
            targetDomain={targetDomain}
            setTargetDomain={setTargetDomain}
            fakeIp={fakeIp}
            setFakeIp={setFakeIp}
            handleTriggerDnsPoison={handleTriggerDnsPoison}
            dnsError={dnsError}
            isDnsAttackActive={isDnsAttackActive}
            handleStopDnsPoison={handleStopDnsPoison}
          />
        </div>
      )}

      {selectedDevice && selectedDevice.type === 'switch' && (
        <SwitchMacTablePanel
          device={selectedDevice}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}

      {selectedDevice && selectedDevice.type !== 'switch' && (
        <DeviceSettingsPanel
          device={selectedDevice}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}

      {selectedLink && (
        <LinkSettingsPanel
          link={selectedLink}
          onClose={() => setSelectedLinkId(null)}
        />
      )}

      {showSaveTopology && <SaveTopologyPanel onClose={() => setShowSaveTopology(false)} />}
      {showLoadTopology && <LoadTopologyPanel onClose={() => setShowLoadTopology(false)} />}
    </div>
  );
}

export default App;
