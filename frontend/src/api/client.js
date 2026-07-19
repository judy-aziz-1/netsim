const BASE_URL = 'http://127.0.0.1:8000/api';

export async function registerUser(name, email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  return res.json();
}

export async function getTopologies(token) {
  const res = await fetch(`${BASE_URL}/network-topologies`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.json();
}

export async function getSecurityEvents(token) {
  const res = await fetch(`${BASE_URL}/security-events`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`getSecurityEvents failed with status ${res.status}`);
  }

  return res.json();
}

export async function getAlerts(token) {
  const res = await fetch(`${BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`getAlerts failed with status ${res.status}`);
  }

  return res.json();
}

export async function getIncidentTickets(token) {
  const res = await fetch(`${BASE_URL}/incident-tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`getIncidentTickets failed with status ${res.status}`);
  }

  return res.json();
}

export async function createIncidentTicket(token, title, description) {
  const res = await fetch(`${BASE_URL}/incident-tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description }),
  });

  if (!res.ok) {
    throw new Error(`createIncidentTicket failed with status ${res.status}`);
  }

  return res.json();
}

export async function getIncidentTicket(token, id) {
  const res = await fetch(`${BASE_URL}/incident-tickets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`getIncidentTicket failed with status ${res.status}`);
  }

  return res.json();
}

export async function updateTicketStatus(token, id, status, note) {
  const res = await fetch(`${BASE_URL}/incident-tickets/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, note }),
  });

  if (!res.ok) {
    throw new Error(`updateTicketStatus failed with status ${res.status}`);
  }

  return res.json();
}

export async function postSecurityEvent(token, eventData) {
  const res = await fetch(`${BASE_URL}/security-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  if (!res.ok) {
    throw new Error(`postSecurityEvent failed with status ${res.status}`);
  }

  return res.json();
}
