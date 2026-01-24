import React, { StrictMode, type PropsWithChildren } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./routes/index.tsx";
import "./index.css";
import {
  AuthContext,
  type AuthContextProps,
  type Payload,
  type User,
} from "./hooks/use-auth.ts";
import api, { setAuthToken } from "./lib/axios.ts";
import { Toaster } from "./components/ui/sonner.tsx";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  </StrictMode>,
);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = React.useState<User>();
  const [payload, setPayload] = React.useState<Payload>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const payload = jwtDecode<Payload>(token);
        const currentTime = Date.now() / 1000;

        setAccessToken(token);
        if (payload.exp && payload.exp < currentTime) {
          await refresh();
        } else {
          setPayload(payload);
          setAuthToken(token);
          fetchMe();
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        signOut();
      }
    };

    checkAuth();
  }, []);

  const signUp = async (
    username: string,
    email: string,
    password: string,
    role: string = "buyer",
  ) => {
    try {
      setLoading(true);
      const response = await api.post("/api/auth/register", {
        username,
        email,
        password,
        role,
      });

      const { user, token } = response.data.data;
      setUser(user);
      setPayload(user);
      setAuthToken(token);
      localStorage.setItem("token", token);
      setAccessToken(token);

    } catch (error) {
      console.error("Failed to sign up:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      const res = await api.post("/api/auth/login", { username, password });
      const { token } = res.data.data;
      setAuthToken(token);
      localStorage.setItem("token", token);
      setAccessToken(token);

      // Fetch full user profile immediately
      await fetchMe();
    } catch (error) {
      console.error("Failed to sign in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/users/me");
      const { user } = res.data;
      setUser(user);
      setPayload({
        userId: user._id,
        username: user.username,
        role: user.role
      });
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Only sign out if it's an auth/token error, not other errors
      if (error.response?.status === 401) {
        // Could be expired token, let's try to continue without force logout
        console.warn("Unauthorized - token may be invalid");
      }
      // Don't automatically sign out - let the user stay logged in with the token
      // signOut(); // REMOVED - this was causing the logout loop
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await api.post("/api/auth/logout");
      setAuthToken(null);
      setUser(undefined);
      setPayload(undefined);
      setAccessToken(null);
      localStorage.removeItem("token");
      toast.success("Log out successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to log out!");
      setAuthToken(null);
      setUser(undefined);
      setPayload(undefined);
      setAccessToken(null);
      localStorage.removeItem("token");
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await api.post(
        "/api/auth/refresh",
        {},
        {
          withCredentials: true,
        },
      );
      const { accessToken } = res.data;

      setAuthToken(accessToken);
      localStorage.setItem("token", accessToken);
      setAccessToken(accessToken);

      const payload = jwtDecode<Payload>(accessToken);
      setPayload(payload);

      toast.success("Làm mới token thành công!");
    } catch (error) {
      console.error("Refresh token failed:", error);
      signOut();
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextProps = {
    user,
    payload,
    loading,
    signUp,
    signIn,
    signOut,
    refresh,
    fetchMe,
    accessToken,
    setUser,
    setToken: (token: string) => {
      setAuthToken(token);
      const payload = jwtDecode<Payload>(token);
      setPayload(payload);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
