import api from "@/lib/axios";

// Order types
export interface OrderItem {
  productId: {
    _id: string;
    title: string;
    price?: number;
    image?: string;
    images?: string[];
  };
  title: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  _id: string;
  buyer: { _id: string; username: string };
  seller: { _id: string; username: string };
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface GetOrdersParams {
  role?: 'buyer' | 'seller';
  includeHidden?: boolean;
}

export interface GetOrdersResponse {
  data: Order[];
}

// Get list of orders
export const getOrders = async (params: GetOrdersParams = {}): Promise<GetOrdersResponse> => {
  const response = await api.get('/api/orders', { params });
  return response.data;
};

// Get order details by ID
export const getOrderDetails = async (orderId: string): Promise<{ data: Order }> => {
  const response = await api.get(`/api/orders/${orderId}`);
  return response.data;
};

// Save a seller
export const saveSeller = async (sellerId: string): Promise<{ message: string; data: { sellerId: string } }> => {
  const response = await api.post(`/api/users/saved-sellers/${sellerId}`);
  return response.data;
};

// Unsave a seller
export const unsaveSeller = async (sellerId: string): Promise<{ message: string; data: { sellerId: string } }> => {
  const response = await api.delete(`/api/users/saved-sellers/${sellerId}`);
  return response.data;
};

// Get saved sellers
export const getSavedSellers = async (): Promise<{ data: Array<{ _id: string; username: string; email: string; avatarUrl?: string; reputationScore: number }> }> => {
  const response = await api.get('/api/users/saved-sellers');
  return response.data;
};

// Hide an order
export const hideOrder = async (orderId: string): Promise<{ message: string; data: { orderId: string } }> => {
  const response = await api.post(`/api/users/hidden-orders/${orderId}`);
  return response.data;
};

// Unhide an order
export const unhideOrder = async (orderId: string): Promise<{ message: string; data: { orderId: string } }> => {
  const response = await api.delete(`/api/users/hidden-orders/${orderId}`);
  return response.data;
};
