/**
 * socket.js
 * Socket.IO client singleton.
 */

import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
