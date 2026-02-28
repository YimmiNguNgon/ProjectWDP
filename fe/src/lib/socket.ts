import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
