import React from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketContextValue {
  socket?: Socket;
}

export const SocketContext = React.createContext<
  SocketContextValue | undefined
>(undefined);

export const useSocket = () => {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
