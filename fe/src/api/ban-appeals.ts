import api from "@/lib/axios";

export interface VerifyBanAppealResponse {
  success: boolean;
  data: {
    username: string;
    banReason: string;
    hasPendingAppeal: boolean;
    pendingAppeal?: {
      _id: string;
      createdAt: string;
    };
  };
}

export const verifyBanAppealToken = async (token: string): Promise<VerifyBanAppealResponse> => {
  const response = await api.get("/api/ban-appeals/verify", {
    params: { token },
  });
  return response.data;
};

export const submitBanAppeal = async (token: string, reason: string) => {
  const response = await api.post("/api/ban-appeals/submit", { token, reason });
  return response.data;
};
