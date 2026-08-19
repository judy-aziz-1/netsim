import { useEffect, useMemo, useState } from 'react';
import { createIncidentTicket, getIncidentTickets, updateTicketStatus } from '../api/client';
import { computeTicketStats, formatRelativeTime } from '../engine/socStats';

const STATUS_ORDER = ['open', 'investigating', 'closed'];

const STATUS_COLOR_VAR = {
  open: 'var(--danger)',
  investigating: 'var(--warning)',
  closed: 'var(--success)',
};

const STATUS_LABEL = {
  open: 'OPEN',
  investigating: 'INVESTIGATING',
  closed: 'CLOSED',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'closed', label: 'Closed' },
];

function SocDashboard({ onCountUpdate }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadTickets = () => {
    setError(null);
    getIncidentTickets()
      .then(setTickets)
      .catch((err) => {
        setTickets([]);
        setError('Failed to load data. Please try again.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = () => {
    createIncidentTicket(title, description)
      .then(() => {
        setTitle('');
        setDescription('');
        loadTickets();
      })
      .catch(console.error);
  };

  const handleStatusChange = (ticketId, status) => {
    updateTicketStatus(ticketId, status, '')
      .then(() => loadTickets())
      .catch(console.error);
  };

  useEffect(() => {
    const openTicketsCount = Array.isArray(tickets)
      ? tickets.filter((ticket) => ticket.status !== 'closed').length
      : 0;

    onCountUpdate?.(openTicketsCount);
  }, [tickets, onCountUpdate]);

  const stats = useMemo(() => computeTicketStats(tickets), [tickets]);

  const filteredTickets = useMemo(() => {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    if (activeFilter === 'all') return safeTickets;
    return safeTickets.filter((ticket) => ticket.status === activeFilter);
  }, [tickets, activeFilter]);

  return (
    <div>
      <div className="field-row" style={{ justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ns-text)' }}>SOC Tickets</div>
        <button className="siem-refresh-btn" onClick={loadTickets}>Refresh</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <>
          <div className="siem-stat-grid">
            <div className="siem-stat-card">
              <div className="siem-stat-card-label">TOTAL TICKETS</div>
              <div className="siem-stat-card-value" style={{ color: 'var(--ns-accent)' }}>{stats.total}</div>
              <div className="siem-stat-card-sub">All submitted tickets</div>
            </div>
            <div className="siem-stat-card">
              <div className="siem-stat-card-label">OPEN</div>
              <div className="siem-stat-card-value" style={{ color: 'var(--danger)' }}>{stats.open}</div>
              <div className="siem-stat-card-sub">Awaiting triage</div>
            </div>
            <div className="siem-stat-card">
              <div className="siem-stat-card-label">INVESTIGATING</div>
              <div className="siem-stat-card-value" style={{ color: 'var(--warning)' }}>{stats.investigating}</div>
              <div className="siem-stat-card-sub">In active review</div>
            </div>
            <div className="siem-stat-card">
              <div className="siem-stat-card-label">CLOSED</div>
              <div className="siem-stat-card-value" style={{ color: 'var(--success)' }}>{stats.closed}</div>
              <div className="siem-stat-card-sub">Resolved tickets</div>
            </div>
          </div>

          <div className="siem-panel">
            <div className="siem-panel-title">New Ticket</div>
            <div className="field-row field-column">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="field-row field-column">
              <textarea
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="field-row">
              <button className="siem-refresh-btn" onClick={handleSubmit}>Submit</button>
            </div>
          </div>

          <div className="siem-filter-tabs">
            {FILTERS.map((filter) => {
              const count = filter.id === 'all' ? stats.total : stats[filter.id];
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`siem-filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>

          <div className="siem-alerts-section">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="siem-ticket-card"
                style={{ borderLeftColor: STATUS_COLOR_VAR[ticket.status] ?? 'var(--ns-text-muted)' }}
              >
                <div className="siem-alert-card-top">
                  <div className="siem-alert-card-left">
                    <span className="siem-alert-description">{ticket.title}</span>
                    {ticket.deviceName && (
                      <span className="siem-ticket-device-badge">{ticket.deviceName}</span>
                    )}
                    <span className="siem-ticket-origin-tag">
                      {ticket.origin === 'auto' ? '⚡ Auto' : '✎ Manual'}
                    </span>
                  </div>
                  <span
                    className="badge"
                    style={{ background: STATUS_COLOR_VAR[ticket.status] ?? 'var(--ns-text-muted)' }}
                  >
                    {STATUS_LABEL[ticket.status] ?? ticket.status}
                  </span>
                </div>
                <div className="siem-alert-card-meta" style={{ paddingLeft: 0 }}>{ticket.description}</div>
                <div className="siem-ticket-timestamp">{formatRelativeTime(ticket.created_at)}</div>

                <div className="siem-ticket-status-row">
                  <span className="siem-panel-hint">Set status:</span>
                  <div className="siem-status-btn-group">
                    {STATUS_ORDER.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`siem-status-btn ${ticket.status === status ? 'active' : ''}`}
                        style={ticket.status === status ? { borderColor: STATUS_COLOR_VAR[status], color: STATUS_COLOR_VAR[status] } : undefined}
                        disabled={ticket.status === status}
                        onClick={() => handleStatusChange(ticket.id, status)}
                      >
                        {STATUS_LABEL[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SocDashboard;
