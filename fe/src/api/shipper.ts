import api from "@/lib/axios";

export interface ShipperOrder {
  _id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    city?: string;
    district?: string;
    ward?: string;
    street?: string;
    detail?: string;
  };
  buyer?: { _id: string; username: string; email: string };
  seller?: { _id: string; username: string; sellerInfo?: { shopName?: string; shopAddress?: string } };
  pickupShipper?: { _id: string; username: string };
  shipper?: { _id: string; username: string; email: string };
  items?: { title: string; quantity: number; unitPrice: number }[];
}

export interface ShipperStats {
  delivered: number;
  inTransit: number;
  totalAccepted: number;
  isAvailable: boolean;
  shipperStatus: "available" | "shipping" | "pending_acceptance";
  assignedProvince?: string;
}

export interface OrdersResponse {
  orders: ShipperOrder[];
  total: number;
  page: number;
  pages: number;
}

export const getAvailableOrders = (page = 1, limit = 20): Promise<{ data: OrdersResponse }> =>
  api.get("/api/shipper/orders/available", { params: { page, limit } });

export const getMyOrders = (params: { page?: number; limit?: number; status?: string } = {}): Promise<{ data: OrdersResponse }> =>
  api.get("/api/shipper/orders/mine", { params });

export const acceptOrder = (orderId: string): Promise<{ data: { ok: boolean; order: ShipperOrder } }> =>
  api.patch(`/api/shipper/orders/${orderId}/accept`);

export const rejectOrder = (orderId: string): Promise<{ data: { ok: boolean } }> =>
  api.patch(`/api/shipper/orders/${orderId}/reject`);

export const arrivedAtDestination = (orderId: string): Promise<{ data: { ok: boolean; order: ShipperOrder } }> =>
  api.patch(`/api/shipper/orders/${orderId}/arrived`);

export const markDelivered = (orderId: string): Promise<{ data: { ok: boolean; order: ShipperOrder } }> =>
  api.patch(`/api/shipper/orders/${orderId}/delivered`);

export const getShipperStats = (): Promise<{ data: ShipperStats }> =>
  api.get("/api/shipper/stats");

