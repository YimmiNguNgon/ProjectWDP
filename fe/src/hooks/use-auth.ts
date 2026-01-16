import React from 'react';

export interface User {
  username: string;
  role: string;
}

export interface Payload {
  userId: string;
  username: string;
  role: string;
}

export interface AuthContextProps {
  user?: User;
  payload?: Payload;
  signUp: (username: string, email: string, password: string, role?: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = React.createContext<AuthContextProps | undefined>(
  undefined
);

export const useAuth = () => {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }

  return context;
};
