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
