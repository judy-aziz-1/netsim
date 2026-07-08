import { useEffect, useState } from 'react';
import {
  createIncidentTicket,
  getIncidentTicket,
  getIncidentTickets,
  updateTicketStatus,
} from '../api/client';
import { useAuthStore } from '../store/authStore';

const STATUS_COLORS = {
  open: '#3498db',
  investigating: '#e67e22',
  closed: '#7f8c8d',
};

function SocDashboard() {
  const token = useAuthStore((state) => state.token);
  const [tickets, setTickets] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = () => {
    getIncidentTickets(token).then(setTickets).catch(console.error);
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
      <h2>New Ticket</h2>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <button onClick={handleSubmit}>Submit</button>

      <h2>Tickets</h2>
      <div>
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => setSelectedTicketId(ticket.id)}
            style={{
              border: `2px solid ${STATUS_COLORS[ticket.status] ?? '#888'}`,
              padding: '8px',
              marginBottom: '8px',
              cursor: 'pointer',
            }}
          >
            <div>{ticket.title}</div>
            <div style={{ color: STATUS_COLORS[ticket.status] ?? '#888', fontWeight: 'bold' }}>
              {ticket.status}
            </div>
          </div>
        ))}
      </div>

      {selectedTicket && (
        <div style={{ border: '1px solid #444', padding: '8px', marginTop: '8px' }}>
          <h3>{selectedTicket.title}</h3>
          <div>{selectedTicket.description}</div>
          <div>Status: {selectedTicket.status}</div>

          {selectedTicket.status === 'open' && (
            <button onClick={() => handleStatusChange('investigating')}>
              Start Investigation
            </button>
          )}
          {selectedTicket.status === 'investigating' && (
            <button onClick={() => handleStatusChange('closed')}>Close Ticket</button>
          )}

          <h4>Audit Log</h4>
          <ul>
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
