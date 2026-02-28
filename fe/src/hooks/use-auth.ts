import React from "react";

export interface User {
  username: string;
  email?: string | undefined;
  avatarUrl?: string;
  role: string;
  isEmailVerified?: boolean;
  sellerStage?: "PROBATION" | "NORMAL" | null;
  sellerInfo?: {
    shopName?: string;
    registeredAt?: string;
    successOrders?: number;
    avgRating?: number;
    refundRate?: number;
    reportRate?: number;
  };
}

export interface Payload {
  userId: string;
  username: string;
  role: string;
  exp?: number;
}

export interface AuthContextProps {
  user?: User;
  payload?: Payload;
  loading: boolean;
  signUp: (
    username: string,
    email: string,
    password: string,
    role?: string,
  ) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
  accessToken: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const AuthContext = React.createContext<AuthContextProps | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }

  return context;
};
