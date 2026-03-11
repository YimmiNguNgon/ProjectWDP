// Reuse the configured axios instance (handles auth token + correct baseURL automatically)
import api from "@/lib/axios";

export type ReportReason =
  | "FAKE_PRODUCT"
  | "WRONG_DESCRIPTION"
  | "SCAM_OR_FRAUD"
  | "POOR_QUALITY"
  | "SPAM_OR_PROHIBITED";

export interface ReportReasonOption {
  value: ReportReason;
  label: string;
  icon: string;
}

export const REPORT_REASONS: ReportReasonOption[] = [
  { value: "FAKE_PRODUCT", label: "Fake Product", icon: "" },
  { value: "WRONG_DESCRIPTION", label: "Wrong Description", icon: "" },
  { value: "SCAM_OR_FRAUD", label: "Scam or Fraud", icon: "" },
  { value: "POOR_QUALITY", label: "Poor Product Quality", icon: "" },
  { value: "SPAM_OR_PROHIBITED", label: "Spam or Prohibited Product", icon: "" },
];

export type ReportStatus = "PENDING" | "VALID" | "REJECTED";

export interface SubmitReportPayload {
  sellerId: string;
  productId?: string;
  orderId?: string;
  reason: ReportReason;
  description: string;
  evidenceUrl?: string;
}

export interface Report {
  _id: string;
  buyer: { _id: string; username: string; email: string; avatarUrl?: string };
  seller: { _id: string; username: string; email: string };
  product?: { _id: string; title: string; images?: string[] };
  order?: { _id: string; totalPrice: number; status: string };
  reason: ReportReason;
  description: string;
  evidenceUrl?: string;
  status: ReportStatus;
  verifiedBy?: { _id: string; username: string };
  verifiedAt?: string;
  adminNote?: string;
  createdAt: string;
}

export interface BuyerReportStats {
  totalReports: number;
  validReports: number;
  rejectedReports: number;
  accuracyScore: number;
  underMonitoring: boolean;
  lastReportAt?: string;
}

// ── Buyer APIs ────────────────────────────────────────────────────────────────

export const submitReport = async (payload: SubmitReportPayload) => {
  const { data } = await api.post("/api/reports", payload);
  return data;
};

export const getMyReports = async (params?: { status?: ReportStatus; page?: number; limit?: number }) => {
  const { data } = await api.get("/api/reports/my", { params });
  return data as { reports: Report[]; total: number; page: number; pages: number };
};

export const getMyReportStats = async () => {
  const { data } = await api.get("/api/reports/my-stats");
  return data as { data: BuyerReportStats };
};

// ── Admin APIs ────────────────────────────────────────────────────────────────

export const adminGetAllReports = async (params?: {
  status?: ReportStatus;
  sellerId?: string;
  buyerId?: string;
  page?: number;
  limit?: number;
}) => {
  const { data } = await api.get("/api/reports", { params });
  return data as { reports: Report[]; total: number; page: number; pages: number };
};

export const adminGetReportById = async (reportId: string) => {
  const { data } = await api.get(`/api/reports/${reportId}`);
  return data as { data: Report };
};

export const adminVerifyReport = async (
  reportId: string,
  payload: { status: "VALID" | "REJECTED"; adminNote?: string }
) => {
  const { data } = await api.patch(`/api/reports/${reportId}/verify`, payload);
  return data;
};

export const adminGetBuyerStats = async (params?: { underMonitoring?: boolean; page?: number; limit?: number }) => {
  const { data } = await api.get("/api/reports/buyer-stats", { params });
  return data;
};

export const adminClearBuyerMonitoring = async (buyerId: string) => {
  const { data } = await api.post(`/api/reports/buyer-stats/${buyerId}/clear-monitoring`);
  return data;
};
