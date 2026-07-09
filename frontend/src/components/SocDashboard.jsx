import { useEffect, useState } from 'react';
import {
  createIncidentTicket,
  getIncidentTicket,
  getIncidentTickets,
  updateTicketStatus,
} from '../api/client';
import { useAuthStore } from '../store/authStore';

const STATUS_BADGE_CLASS = {
  open: 'badge-open',
  investigating: 'badge-investigating',
  closed: 'badge-closed',
};

function SocDashboard() {
  const token = useAuthStore((state) => state.token);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = () => {
    setError(null);
    getIncidentTickets(token)
      .then(setTickets)
      .catch((err) => {
        setTickets([]);
        setError('Please log in to view this data.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    getIncidentTicket(token, selectedTicketId).then(setSelectedTicket).catch(console.error);
  }, [selectedTicketId, tickets]);

  const handleSubmit = () => {
    createIncidentTicket(token, title, description)
      .then(() => {
        setTitle('');
        setDescription('');
        loadTickets();
      })
      .catch(console.error);
  };

  const handleStatusChange = (status) => {
    updateTicketStatus(token, selectedTicketId, status, '')
      .then(() => loadTickets())
      .catch(console.error);
  };

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <div className="section">
        <h2>New Ticket</h2>
        <div className="field-row">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="field-row">
          <textarea
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="field-row">
          <button className="btn" onClick={handleSubmit}>Submit</button>
        </div>
      </div>

      <div className="section">
        <h2>Tickets</h2>

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="card clickable"
              onClick={() => setSelectedTicketId(ticket.id)}
            >
              <div className="card-header">
                <span>{ticket.title}</span>
                <span className={`badge ${STATUS_BADGE_CLASS[ticket.status] ?? ''}`}>
                  {ticket.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTicket && (
        <div className="ticket-detail">
          <div className="card-header">
            <h3>{selectedTicket.title}</h3>
            <span className={`badge ${STATUS_BADGE_CLASS[selectedTicket.status] ?? ''}`}>
              {selectedTicket.status}
            </span>
          </div>
          <p>{selectedTicket.description}</p>

          <div className="field-row">
            {selectedTicket.status === 'open' && (
              <button className="btn" onClick={() => handleStatusChange('investigating')}>
                Start Investigation
              </button>
            )}
            {selectedTicket.status === 'investigating' && (
              <button className="btn" onClick={() => handleStatusChange('closed')}>
                Close Ticket
              </button>
            )}
          </div>

          <h4>Audit Log</h4>
          <ul className="audit-log">
            {(selectedTicket.auditLog ?? []).map((entry, index) => (
              <li key={index}>
                {entry.timestamp} — {entry.action}: {entry.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SocDashboard;
