import React, { StrictMode, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './routes/index.tsx';
import './index.css';
import {
  AuthContext,
  type AuthContextProps,
  type Payload,
  type User,
} from './hooks/use-auth.ts';
import api, { setAuthToken } from './lib/axios.ts';
import { Toaster } from './components/ui/sonner.tsx';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  </StrictMode>
);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = React.useState<User>();
  const [payload, setPayload] = React.useState<Payload>();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
    }
  }, [user]);

  const signUp = async (
    username: string,
    email: string,
    password: string,
    role: string = 'buyer'
  ) => {
    const res = await api.post('/api/v1/auth/register', {
      username,
      email,
      password,
      role,
    });
    const { user, token } = res.data.data;
    setUser({ username: user.username, role: user.role });
    setAuthToken(token);
  };

  const signIn = async (username: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { username, password });
    const { user, token } = res.data.data;
    setUser({ username: user.username, role: user.role });
    setAuthToken(token);
  };

  const signOut = () => {
    setAuthToken(null);
    setUser(undefined);
    setPayload(undefined);
  };

  const value: AuthContextProps = {
    user,
    payload,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
