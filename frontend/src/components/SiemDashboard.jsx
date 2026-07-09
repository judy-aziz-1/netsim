import { useEffect, useState } from 'react';
import { getAlerts, getSecurityEvents } from '../api/client';
import { useAuthStore } from '../store/authStore';

const SEVERITY_BADGE_CLASS = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

function SiemDashboard() {
  const token = useAuthStore((state) => state.token);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setError(null);
    Promise.all([getAlerts(token), getSecurityEvents(token)])
      .then(([alertsData, eventsData]) => {
        setAlerts(alertsData);
        setEvents(eventsData);
      })
      .catch((err) => {
        setAlerts([]);
        setEvents([]);
        setError('Please log in to view this data.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div className="field-row">
        <button className="btn" onClick={loadData}>Refresh</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <>
          <div className="section">
            <h2>Alerts</h2>
            {alerts.map((alert) => (
              <div key={alert.id} className="card">
                <div className="card-header">
                  <span className={`badge ${SEVERITY_BADGE_CLASS[alert.severity] ?? ''}`}>
                    {alert.severity}
                  </span>
                  <span className="badge badge-neutral">{alert.status}</span>
                </div>
                <div>{alert.description}</div>
                <div className="loading-text">Event count: {alert.eventCount}</div>
              </div>
            ))}
          </div>

          <div className="section">
            <h2>Security Events</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Attacker</th>
                  <th>Victim</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.eventType}</td>
                    <td>{event.attackerDeviceId}</td>
                    <td>{event.victimDeviceId}</td>
                    <td>{event.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default SiemDashboard;
