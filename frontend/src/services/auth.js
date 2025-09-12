const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
}

export async function register(email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
}
