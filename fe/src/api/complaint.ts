import api from "@/lib/axios";

export interface ComplaintPayload {
  orderId: string;
  sellerId: string;
  reason: string;
  content: string;
  attachments?: { url: string }[];
}

/** Lấy danh sách đơn hàng của buyer */
export const getMyOrders = async () => {
  const response = await api.get("/api/orders", { params: { role: "buyer" } });
  return response.data;
};

/** Lấy danh sách khiếu nại của buyer hiện tại */
export const getMyComplaints = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get("/api/complaints/my", { params });
  return response.data;
};

/** Tạo khiếu nại mới cho 1 đơn hàng */
export const createComplaint = async (data: ComplaintPayload) => {
  const response = await api.post("/api/complaints", data);
  return response.data;
};

/** Lấy chi tiết 1 khiếu nại */
export const getComplaintDetail = async (id: string) => {
  const response = await api.get(`/api/complaints/${id}`);
  return response.data;
};

/** Buyer đẩy khiếu nại lên Admin (khi Seller từ chối) */
export const sendComplaintToAdmin = async (id: string, note?: string) => {
  const response = await api.post(`/api/complaints/${id}/send-to-admin`, { note });
  return response.data;
};
