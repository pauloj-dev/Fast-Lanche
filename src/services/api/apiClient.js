const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('A API ainda nao esta configurada.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!response.ok) throw new Error(`Falha na API (${response.status}).`);
  return response.status === 204 ? null : response.json();
}
