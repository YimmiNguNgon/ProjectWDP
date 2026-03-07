import api from "@/lib/axios";

export type DisputeStatus =
  | "PENDING_SHIPPER"
  | "SHIPPER_RESPONDED"
  | "CONFIRMED"
  | "REPORTED_TO_ADMIN";

export interface DeliveryDispute {
  _id: string;
  order: string;
  buyer: { _id: string; username: string } | string;
  shipper: { _id: string; username: string } | string | null;
  status: DisputeStatus;
  buyerNote: string;
  shipperNote: string;
  shipperImages: string[];
  adminNote: string;
  adminNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Buyer ───────────────────────────────────────────────────────────────────
export const getDisputeByOrder = (orderId: string) =>
  api.get<{ dispute: DeliveryDispute | null }>(`/api/delivery-disputes/order/${orderId}`);

export const confirmReceived = (orderId: string) =>
  api.post(`/api/delivery-disputes/order/${orderId}/confirm-received`);

export const reportNotReceived = (orderId: string, buyerNote: string, skipToAdmin = false) =>
  api.post(`/api/delivery-disputes/order/${orderId}/report-not-received`, { buyerNote, skipToAdmin });

export const buyerConfirmAfterDispute = (disputeId: string) =>
  api.patch(`/api/delivery-disputes/${disputeId}/confirm`);

export const buyerReportToAdmin = (disputeId: string) =>
  api.patch(`/api/delivery-disputes/${disputeId}/report-to-admin`);

// ─── Shipper ──────────────────────────────────────────────────────────────────
export interface ShipperDisputeItem {
  _id: string;
  status: DisputeStatus;
  buyerNote: string;
  shipperNote: string;
  shipperImages: string[];
  createdAt: string;
  updatedAt: string;
  buyer: { _id: string; username: string; email: string };
  order: {
    _id: string;
    totalAmount: number;
    createdAt: string;
    shippingAddress?: { fullName?: string; city?: string; district?: string };
    items: { title: string; quantity: number; unitPrice: number }[];
  };
}

export const getShipperDisputes = (status?: string) =>
  api.get<{ disputes: ShipperDisputeItem[] }>("/api/delivery-disputes/shipper/list", {
    params: status ? { status } : {},
  });

export const shipperRespond = (
  disputeId: string,
  data: { shipperNote: string; shipperImages: string[] },
) => api.patch(`/api/delivery-disputes/${disputeId}/respond`, data);

export const uploadDisputeImages = async (files: File[]): Promise<string[]> => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  const res = await api.post<{ urls: string[] }>("/api/upload/dispute-images", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.urls;
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface AdminDisputeItem {
  _id: string;
  status: DisputeStatus;
  buyerNote: string;
  shipperNote: string;
  shipperImages: string[];
  adminNote: string;
  adminNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: { _id: string; username: string; email: string };
  shipper: { _id: string; username: string; email: string } | null;
  order: {
    _id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    shippingAddress?: { fullName?: string; city?: string; district?: string };
  };
}

export const adminGetDisputes = (params: { status?: string; page?: number } = {}) =>
  api.get<{ disputes: AdminDisputeItem[]; total: number; page: number; pages: number }>(
    "/api/delivery-disputes/admin/list",
    { params },
  );

export const adminNotifyBuyer = (disputeId: string, adminNote: string) =>
  api.patch(`/api/delivery-disputes/${disputeId}/admin-notify`, { adminNote });
