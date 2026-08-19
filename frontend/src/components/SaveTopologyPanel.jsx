import { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/topologyStore';
import { getTopologies } from '../api/client';
import { formatRelativeTime } from '../engine/socStats';

function SaveTopologyPanel({ onClose }) {
  const saveTopology = useTopologyStore((state) => state.saveTopology);
  const pushToast = useTopologyStore((state) => state.pushToast);

  const [name, setName] = useState('');
  const [existingTopologies, setExistingTopologies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getTopologies()
      .then((topologies) => {
        if (!cancelled) {
          setExistingTopologies(Array.isArray(topologies) ? topologies : []);
        }
      })
      .catch(() => {
        // Non-critical — duplicate-name check is best-effort only.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedName = name.trim();
  const duplicate = trimmedName
    ? existingTopologies.find((topology) => topology.name === trimmedName)
    : null;

  const handleSave = async () => {
    if (!trimmedName) {
      setError('Enter a name for this topology');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await saveTopology(trimmedName);

    setSaving(false);

    if (!result.success) {
      setError(result.reason ?? 'Failed to save topology');
      return;
    }

    pushToast(`Saved topology "${trimmedName}"`);
    onClose();
  };

  return (
    <div className="device-settings-panel">
      <h1 className="device-settings-title">Save Topology</h1>
      <div className="field-row field-column">
        <label className="field-label">Name</label>
        <input
          type="text"
          placeholder="e.g. Two-router DMZ"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
      </div>
      {duplicate && (
        <p className="loading-text">
          A topology named "{trimmedName}" already exists (saved{' '}
          {formatRelativeTime(duplicate.created_at)}) — saving will add another entry with the
          same name.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      <div className="field-row">
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SaveTopologyPanel;
