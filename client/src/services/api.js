/**
 * api.js
 * REST client for Room creation and lookup.
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 
  (typeof window !== 'undefined' && window.location.port !== '5173' ? '' : 'http://localhost:5000');

export async function createRoomApi(ttlMinutes = 30, roomType = 'group') {
  const response = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttlMinutes, roomType })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create temporary room.');
  }

  return response.json();
}

export async function lookupRoomApi(roomId) {
  const response = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Room does not exist or has expired.');
  }

  return response.json();
}
