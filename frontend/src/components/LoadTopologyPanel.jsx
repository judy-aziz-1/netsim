import { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/topologyStore';
import { getTopologies } from '../api/client';
import { formatRelativeTime } from '../engine/socStats';
import ConfirmDialog from './ConfirmDialog';

function LoadTopologyPanel({ onClose }) {
  const loadTopology = useTopologyStore((state) => state.loadTopology);
  const deleteTopology = useTopologyStore((state) => state.deleteTopology);
  const pushToast = useTopologyStore((state) => state.pushToast);

  const [topologies, setTopologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [pendingDeleteTopology, setPendingDeleteTopology] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getTopologies()
      .then((result) => {
        if (!cancelled) {
          setTopologies(Array.isArray(result) ? result : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load saved topologies');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoad = (topology) => {
    loadTopology(topology.data);
    pushToast(`Loaded topology "${topology.name ?? 'Untitled'}"`);
    onClose();
  };

  const performDelete = async (topology) => {
    const id = topology.id ?? topology._id;
    const label = topology.name ?? 'Untitled';

    setDeleteError(null);

    const result = await deleteTopology(id);

    if (!result.success) {
      setDeleteError(result.reason ?? 'Failed to delete topology');
      return;
    }

    setTopologies((prev) => prev.filter((t) => (t.id ?? t._id) !== id));
    pushToast(`Deleted topology "${label}"`);
  };

  return (
    <div className="device-settings-panel">
      <h1 className="device-settings-title">Load Topology</h1>

      {loading && <p className="loading-text">Loading saved topologies…</p>}
      {error && <p className="error-text">{error}</p>}
      {deleteError && <p className="error-text">{deleteError}</p>}
      {!loading && !error && topologies.length === 0 && (
        <p className="loading-text">No saved topologies yet — save one from the Network Editor first.</p>
      )}

      {!loading && !error && topologies.length > 0 && (
        <div className="ns-topology-list">
          {topologies.map((topology) => (
            <div key={topology._id ?? topology.id ?? topology.name} className="ns-topology-list-item">
              <div className="ns-topology-list-item-info">
                <div className="ns-topology-list-item-name">{topology.name ?? 'Untitled'}</div>
                <div className="ns-topology-list-item-meta">
                  {formatRelativeTime(topology.created_at)} · {topology.data?.devices?.length ?? 0} devices
                </div>
              </div>
              <button className="btn" onClick={() => handleLoad(topology)}>
                Load
              </button>
              <button
                className="ns-topology-delete-btn"
                onClick={() => setPendingDeleteTopology(topology)}
                title="Delete this topology"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="field-row">
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>

      {pendingDeleteTopology && (
        <ConfirmDialog
          message={`Delete topology "${pendingDeleteTopology.name ?? 'Untitled'}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            const topology = pendingDeleteTopology;
            setPendingDeleteTopology(null);
            performDelete(topology);
          }}
          onCancel={() => setPendingDeleteTopology(null)}
        />
      )}
    </div>
  );
}

export default LoadTopologyPanel;
