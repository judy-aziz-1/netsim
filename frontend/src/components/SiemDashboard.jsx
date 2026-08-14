import { useEffect, useMemo, useState } from 'react';
import { getAlerts, getSecurityEvents } from '../api/client';
import { computeSiemOverview } from '../engine/siemStats';

const SEVERITY_BORDER_VAR = {
  high: 'var(--color-high)',
  medium: 'var(--color-medium)',
  low: 'var(--color-low)',
};

const SEVERITY_BADGE_CLASS = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

function SiemDashboard({ onCountUpdate }) {
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventsOpen, setEventsOpen] = useState(true);

  const loadData = () => {
    setError(null);
    Promise.all([getAlerts(), getSecurityEvents()])
      .then(([alertsData, eventsData]) => {
        setAlerts(alertsData);
        setEvents(eventsData);
      })
      .catch((err) => {
        setAlerts([]);
        setEvents([]);
        setError('Failed to load data. Please try again.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeThreats = Array.isArray(alerts)
    ? alerts.filter((alert) => alert.status === 'open').length
    : 0;

  useEffect(() => {
    onCountUpdate?.(activeThreats);
  }, [activeThreats, onCountUpdate]);

  const overview = useMemo(() => computeSiemOverview(events, alerts), [events, alerts]);

  return (
    <div>
      <div className="field-row">
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ns-text)' }}>Security Overview</div>
        <button className="siem-refresh-btn" onClick={loadData}>Refresh</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <>
          <div className="siem-stat-grid">
            {overview.statCards.map((card) => (
              <div key={card.label} className="siem-stat-card">
                <div className="siem-stat-card-label">{card.label}</div>
                <div className="siem-stat-card-value" style={{ color: card.color }}>{card.value}</div>
                <div className="siem-stat-card-sub">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="siem-charts-grid">
            <div className="siem-panel">
              <div className="siem-panel-title">Attack Type Distribution</div>
              <div className="siem-donut-row">
                <div className="siem-donut-wrap">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="55" fill="none" stroke="var(--ns-bg-input)" strokeWidth="20" />
                    {overview.donutSegments.map((seg, i) => (
                      <circle
                        key={i}
                        cx="70"
                        cy="70"
                        r="55"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="20"
                        strokeDasharray={seg.dash}
                        strokeDashoffset={seg.offset}
                        transform="rotate(-90 70 70)"
                      />
                    ))}
                  </svg>
                  <div className="siem-donut-center">
                    <div className="siem-donut-center-value">{overview.totalEvents}</div>
                    <div className="siem-donut-center-label">events</div>
                  </div>
                </div>
                <div className="siem-donut-legend">
                  {overview.legend.length === 0 && <div className="loading-text">No events yet</div>}
                  {overview.legend.map((l) => (
                    <div key={l.label} className="siem-donut-legend-row">
                      <span className="siem-legend-swatch" style={{ background: l.color }} />
                      <span className="siem-legend-label">{l.label}</span>
                      <span className="siem-legend-count">{l.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="siem-panel">
              <div className="siem-panel-title-row">
                <div className="siem-panel-title">
                  {`Event Activity (per ${overview.timelineBucketMinutes === 1 ? 'minute' : `${overview.timelineBucketMinutes} min`}) — last 24h`}
                </div>
                <div className="siem-panel-hint">Correlation window: 60s · threshold: 3</div>
              </div>
              <div className="siem-timeline-bars">
                {overview.timelineBars.length === 0 && <div className="loading-text">No events yet</div>}
                {overview.timelineBars.map((bar, i) => (
                  <div key={i} className="siem-timeline-bar-col">
                    <div
                      className="siem-timeline-bar"
                      style={{
                        height: `${bar.heightPct}%`,
                        background: bar.isBurst
                          ? 'var(--danger)'
                          : bar.count > 0
                            ? 'var(--ns-accent)'
                            : 'var(--ns-border-strong)',
                        boxShadow: bar.isBurst ? '0 0 8px rgba(231, 76, 60, 0.5)' : 'none',
                      }}
                    />
                    <div className="siem-timeline-bar-time">{bar.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="siem-panel">
            <div className="siem-panel-title">Most Active Devices</div>
            <div className="siem-devices-grid">
              <div className="siem-device-list">
                <div className="siem-device-list-label">TOP ATTACKERS</div>
                {overview.topAttackers.map((a) => (
                  <div key={a.id} className="siem-device-row">
                    <div className="siem-device-name">{a.name}</div>
                    <div className="siem-device-bar-track">
                      <div className="siem-device-bar-fill" style={{ width: `${a.pct}%`, background: 'var(--danger)' }} />
                    </div>
                    <div className="siem-device-count">{a.count}</div>
                  </div>
                ))}
              </div>
              <div className="siem-device-list">
                <div className="siem-device-list-label">TOP VICTIMS</div>
                {overview.topVictims.map((v) => (
                  <div key={v.id} className="siem-device-row">
                    <div className="siem-device-name">{v.name}</div>
                    <div className="siem-device-bar-track">
                      <div className="siem-device-bar-fill" style={{ width: `${v.pct}%`, background: 'var(--warning)' }} />
                    </div>
                    <div className="siem-device-count">{v.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="siem-alerts-section">
            <div className="siem-section-label">ALERTS</div>
            {Array.isArray(alerts) && alerts.map((alert) => (
              <div
                key={alert.id}
                className="siem-alert-card"
                style={{ borderLeftColor: SEVERITY_BORDER_VAR[alert.severity] ?? 'var(--ns-text-muted)' }}
              >
                <div className="siem-alert-card-top">
                  <div className="siem-alert-card-left">
                    <span className={`badge ${SEVERITY_BADGE_CLASS[alert.severity] ?? ''}`}>
                      {alert.severity}
                    </span>
                    <span className="siem-alert-description">{alert.description}</span>
                  </div>
                  <span className="badge badge-neutral">{alert.status}</span>
                </div>
                <div className="siem-alert-card-meta">Event count: {alert.eventCount}</div>
              </div>
            ))}
          </div>

          <div className="siem-events-panel">
            <div className="siem-events-header" onClick={() => setEventsOpen((open) => !open)}>
              <div className="siem-section-label">SECURITY EVENTS ({overview.totalEvents})</div>
              <div className="siem-panel-hint">{eventsOpen ? '▲ Collapse' : '▼ Expand'}</div>
            </div>
            {eventsOpen && (
              <div className="siem-events-table-wrap">
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
                    {Array.isArray(events) && events.map((event) => {
                      const isBlocked = event.eventType?.startsWith('firewall_blocked');

                      return (
                        <tr key={event.id}>
                          <td className={isBlocked ? 'badge-blocked' : ''}>
                            {isBlocked ? `🛡️ Blocked: ${event.eventType}` : event.eventType}
                          </td>
                          <td>{event.attackerDeviceName || event.attackerDeviceId}</td>
                          <td>{event.victimDeviceName || event.victimDeviceId}</td>
                          <td>{event.created_at}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SiemDashboard;
