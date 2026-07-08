import { useEffect, useState } from 'react';
import { getAlerts, getSecurityEvents } from '../api/client';
import { useAuthStore } from '../store/authStore';

const SEVERITY_COLORS = {
  high: '#e74c3c',
  medium: '#e67e22',
  low: '#f1c40f',
};

function SiemDashboard() {
  const token = useAuthStore((state) => state.token);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);

  const loadData = () => {
    getAlerts(token).then(setAlerts).catch(console.error);
    getSecurityEvents(token).then(setEvents).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <button onClick={loadData}>Refresh</button>

      <h2>Alerts</h2>
      <div>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              border: `2px solid ${SEVERITY_COLORS[alert.severity] ?? '#888'}`,
              padding: '8px',
              marginBottom: '8px',
            }}
          >
            <div style={{ color: SEVERITY_COLORS[alert.severity] ?? '#888', fontWeight: 'bold' }}>
              {alert.severity}
            </div>
            <div>{alert.description}</div>
            <div>Event count: {alert.eventCount}</div>
            <div>Status: {alert.status}</div>
          </div>
        ))}
      </div>

      <h2>Security Events</h2>
      <table border="1" cellPadding="4">
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
  );
}

export default SiemDashboard;
