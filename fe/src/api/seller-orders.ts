import api from "@/lib/axios";

export interface OrderStatusUpdate {
  status: "processing" | "shipped" | "delivered" | "cancelled" | "failed" | "returned";
  note?: string;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note: string;
}

/**
 * Update order status (seller only)
 */
export async function updateOrderStatus(orderId: string, data: OrderStatusUpdate) {
  const response = await api.patch(`/api/orders/${orderId}/status`, data);
  return response.data;
}

/**
 * Add tracking number to order
 */
export async function addTrackingNumber(
  orderId: string,
  trackingNumber: string,
  estimatedDelivery?: string
) {
  const response = await api.patch(`/api/orders/${orderId}/tracking`, {
    trackingNumber,
    estimatedDelivery,
  });
  return response.data;
}

/**
 * Get order status history
 */
export async function getStatusHistory(orderId: string): Promise<{ data: StatusHistoryEntry[] }> {
  const response = await api.get(`/api/orders/${orderId}/history`);
  return response.data;
}

/**
 * Generate shipping label PDF
 */
export async function generateShippingLabel(orderId: string) {
  const response = await api.post(`/api/orders/${orderId}/shipping-label`, {}, {
    responseType: 'blob', // Important for file download
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `shipping-label-${orderId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return response.data;
}

/**
 * Update shipping address (buyer only, before shipped)
 */
export async function updateShippingAddress(orderId: string, address: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}) {
  const response = await api.patch(`/api/orders/${orderId}/shipping-address`, address);
  return response.data;
}
