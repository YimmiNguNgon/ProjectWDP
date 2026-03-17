import api from "@/lib/axios";

export type VoucherType = "percentage" | "fixed";
export type VoucherScope = "global" | "seller";
export type VoucherRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface VoucherRequest {
  _id: string;
  seller: string | { _id: string; username?: string; email?: string } | null;
  code: string;
  type: VoucherType;
  value: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  status: VoucherRequestStatus;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string | { _id: string; username: string };
  reviewedAt?: string | null;
  voucher?: string | { _id: string; code: string; isActive: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface Voucher {
  _id: string;
  scope: VoucherScope;
  seller: string | null;
  sellerName?: string;
  code: string;
  type: VoucherType;
  value: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  remainingUsage: number | null;
  remainingForUser: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClaimable: boolean;
  estimatedDiscount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoucherPayload {
  code: string;
  type: VoucherType;
  value: number;
  minOrderValue?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number;
  startDate?: string;
  endDate: string;
}

export type GlobalVoucherPayload = VoucherPayload;

export interface VoucherValidationResponse {
  voucherId: string;
  sellerId: string | null;
  sellerName?: string;
  voucherCode: string;
  scope: VoucherScope;
  discountAmount: number;
  finalAmount: number;
  usageLimit: number | null;
  usedCount: number;
  remainingUsage: number | null;
}

export const validateVoucher = async (
  code: string,
  totalAmount: number,
  sellerId?: string,
  scope?: VoucherScope,
) => {
  const response = await api.post("/api/vouchers/validate", {
    code,
    totalAmount,
    sellerId,
    scope,
  });
  return response.data as {
    success: boolean;
    message: string;
    data: VoucherValidationResponse;
  };
};

export const getAvailableVouchers = async (params?: {
  scope?: "all" | VoucherScope;
  sellerId?: string;
  subtotal?: number;
}) => {
  const response = await api.get("/api/vouchers/available", { params });
  return response.data as { success: boolean; data: Voucher[] };
};

export const claimVoucherCode = async (code: string) => {
  const response = await api.post("/api/vouchers/claim", { code });
  return response.data as { success: boolean; message: string; data: Voucher };
};

export const getMyVoucherWallet = async () => {
  const response = await api.get("/api/vouchers/my-wallet");
  return response.data as { success: boolean; data: Voucher[] };
};

export const requestVoucher = async (payload: VoucherPayload) => {
  const response = await api.post("/api/vouchers/requests", payload);
  return response.data as { success: boolean; message: string; data: VoucherRequest };
};

export const getMyVoucherRequests = async (params?: { status?: string }) => {
  const response = await api.get("/api/vouchers/my-requests", { params });
  return response.data as { success: boolean; data: VoucherRequest[] };
};

export const cancelVoucherRequest = async (requestId: string) => {
  const response = await api.delete(`/api/vouchers/requests/${requestId}`);
  return response.data as { success: boolean; message: string };
};

export const getMyVouchers = async (params?: { isActive?: boolean }) => {
  const response = await api.get("/api/vouchers/my-vouchers", { params });
  return response.data as { success: boolean; data: Voucher[] };
};

export const setMyVoucherStatus = async (voucherId: string, isActive: boolean) => {
  const response = await api.patch(`/api/vouchers/my-vouchers/${voucherId}/status`, {
    isActive,
  });
  return response.data as { success: boolean; message: string; data: Voucher };
};

export const getAdminVoucherRequests = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get("/api/vouchers/admin/requests", { params });
  return response.data as {
    success: boolean;
    data: VoucherRequest[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
};

export const approveVoucherRequest = async (
  requestId: string,
  adminNotes?: string,
) => {
  const response = await api.post(`/api/vouchers/admin/requests/${requestId}/approve`, {
    adminNotes,
  });
  return response.data as { success: boolean; message: string };
};

export const rejectVoucherRequest = async (
  requestId: string,
  rejectionReason: string,
  adminNotes?: string,
) => {
  const response = await api.post(`/api/vouchers/admin/requests/${requestId}/reject`, {
    rejectionReason,
    adminNotes,
  });
  return response.data as { success: boolean; message: string };
};

export const createAdminGlobalVoucher = async (payload: GlobalVoucherPayload) => {
  const response = await api.post("/api/vouchers/admin/global", payload);
  return response.data as { success: boolean; message: string; data: Voucher };
};

export const getAdminGlobalVouchers = async (params?: { isActive?: boolean }) => {
  const response = await api.get("/api/vouchers/admin/global", { params });
  return response.data as { success: boolean; data: Voucher[] };
};

export const setAdminGlobalVoucherStatus = async (
  voucherId: string,
  isActive: boolean,
) => {
  const response = await api.patch(`/api/vouchers/admin/global/${voucherId}/status`, {
    isActive,
  });
  return response.data as { success: boolean; message: string; data: Voucher };
};
