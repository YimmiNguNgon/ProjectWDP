import api from "@/lib/axios";

// Stub for complaint API methods that were missing but imported by my-orders.tsx

export const getMyOrders = async () => {
  const response = await api.get('/api/orders', { params: { role: 'buyer' } });
  return response.data;
};

export const getMyComplaints = async () => {
  return { data: [] }; // Mock empty response for now
};

export const createComplaint = async (_data: any) => {
  return { data: {} }; // Mock success
};
