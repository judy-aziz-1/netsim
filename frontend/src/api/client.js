const BASE_URL = 'http://127.0.0.1:8000/api';

export async function getTopologies() {
  const res = await fetch(`${BASE_URL}/network-topologies`);

  return res.json();
}

export async function getSecurityEvents() {
  const res = await fetch(`${BASE_URL}/security-events`);

  if (!res.ok) {
    throw new Error(`getSecurityEvents failed with status ${res.status}`);
  }

  return res.json();
}

export async function getAlerts() {
  const res = await fetch(`${BASE_URL}/alerts`);

  if (!res.ok) {
    throw new Error(`getAlerts failed with status ${res.status}`);
  }

  return res.json();
}

export async function getIncidentTickets() {
  const res = await fetch(`${BASE_URL}/incident-tickets`);

  if (!res.ok) {
    throw new Error(`getIncidentTickets failed with status ${res.status}`);
  }

  return res.json();
}

export async function createIncidentTicket(title, description) {
  const res = await fetch(`${BASE_URL}/incident-tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });

  if (!res.ok) {
    throw new Error(`createIncidentTicket failed with status ${res.status}`);
  }

  return res.json();
}

export async function getIncidentTicket(id) {
  const res = await fetch(`${BASE_URL}/incident-tickets/${id}`);

  if (!res.ok) {
    throw new Error(`getIncidentTicket failed with status ${res.status}`);
  }

  return res.json();
}

export async function updateTicketStatus(id, status, note) {
  const res = await fetch(`${BASE_URL}/incident-tickets/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  });

  if (!res.ok) {
    throw new Error(`updateTicketStatus failed with status ${res.status}`);
  }

  return res.json();
}

export async function postSecurityEvent(eventData) {
  const res = await fetch(`${BASE_URL}/security-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });

  if (!res.ok) {
    throw new Error(`postSecurityEvent failed with status ${res.status}`);
  }

  return res.json();
}
