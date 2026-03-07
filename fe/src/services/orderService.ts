// services/orderService.ts
import axios from "axios";
import api from "@/lib/axios";

const API_URL = "/api/orders";

interface ApiOrder {
  _id: string;
  orderId?: string;
  customer?: {
    _id: string;
    username: string;
    email: string;
  };
  seller?: {
    _id: string;
    username: string;
    email: string;
  };
  totalAmount?: number;
  total?: number; // legacy support
  status: string;
  paymentStatus?: string;
  items: any[];
  itemCount?: number;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    detail?: string;
    ward?: string;
    district?: string;
    city?: string;
    street?: string;
  };
  paymentMethod?: string;
  note?: string;
  orderDetails?: any[];
}

export interface Order {
  _id: string;
  orderId?: string;
  username: string;
  email: string;
  total: number;
  status:
    | "created"
    | "packaging"
    | "ready_to_ship"
    | "shipping"
    | "delivered"
    | "completed"
    | "cancelled"
    | "failed"
    | "returned";
  paymentStatus: "unpaid" | "paid" | "failed" | "refunded";
  items: number;
  date: string;
  paymentMethod: string;
  phone?: string;
  address?: string;
  note?: string;
  orderDetails?: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    productImage?: string;
    variantSku?: string;
    selectedVariants?: Array<{ name: string; value: string }>;
    note?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

const mapStatus = (status: string): Order["status"] => {
  switch (status.toLowerCase()) {
    case "created":
    case "pending":
      return "created";
    case "packaging":
      return "packaging";
    case "ready_to_ship":
      return "ready_to_ship";
    case "shipped":
    case "shipping":
      return "shipping";
    case "delivered":
      return "delivered";
    case "completed":
      return "completed";
    case "returned":
      return "returned";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      console.warn("Unknown status:", status);
      return "created";
  }
};

const mapPaymentStatus = (status: string): Order["paymentStatus"] => {
  switch (status.toLowerCase()) {
    case "unpaid":
      return "unpaid";
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      console.warn("Unknown status:", status);
      return "unpaid";
  }
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const formatFullDate = (dateString: string): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const transformOrder = (apiOrder: ApiOrder): Order => {
  const address = apiOrder.shippingAddress;
  const addressString = address
    ? [
        address.detail,
        address.street,
        address.ward,
        address.district,
        address.city,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    _id: apiOrder._id,
    orderId: apiOrder.orderId,
    username: apiOrder.customer?.username || "Customer",
    email: apiOrder.customer?.email || "",
    total: apiOrder.totalAmount || apiOrder.total || 0,
    status: mapStatus(apiOrder.status || "pending"),
    paymentStatus: mapPaymentStatus(apiOrder.paymentStatus || "unpaid"),
    items:
      apiOrder.itemCount ||
      (Array.isArray(apiOrder.items) ? apiOrder.items.length : 0) ||
      0,
    date: formatDate(apiOrder.date || apiOrder.createdAt || ""),
    paymentMethod: apiOrder.paymentMethod || "Credit Card",
    phone: address?.phone || apiOrder.shippingAddress?.phone || "",
    address: addressString || "",
    note: apiOrder.note || "",
    orderDetails: (apiOrder.items || []).map((item) => ({
      productId:
        typeof item.productId === "object"
          ? item.productId._id
          : item.productId,
      productName: item.title || item.productName || "Product",
      unitPrice: item.unitPrice || 0,
      quantity: item.quantity || 1,
      subtotal: item.subtotal || item.unitPrice * item.quantity || 0,
      productImage:
        item.productId?.image ||
        item.productId?.images?.[0] ||
        item.image ||
        "",
      variantSku: item.variantSku || "",
      selectedVariants: item.selectedVariants || [],
    })),
    createdAt: apiOrder.createdAt,
    updatedAt: apiOrder.updatedAt,
  };
};

export const orderService = {
  // Láº¥y táº¥t cáº£ orders
  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await api.get(`${API_URL}/all`);
      const apiOrders: ApiOrder[] = response.data.data || [];
      return apiOrders.map(transformOrder);
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  },

  // Láº¥y orders vá»›i filter vÃ  pagination
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    try {
      const response = await api.get(API_URL, {
        params: { role: "seller", ...params },
      });
      const apiOrders: ApiOrder[] = response.data.data || [];
      const orders = apiOrders.map(transformOrder);

      return {
        orders,
        total: response.data.pagination?.total || orders.length,
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      return { orders: [], total: 0 };
    }
  },

  // Láº¥y chi tiáº¿t order theo ID
  async getOrderById(id: string): Promise<Order | null> {
    try {
      const response = await api.get(`${API_URL}/${id}`);

      if (!response.data.success || !response.data.data) {
        return null;
      }

      const apiOrder = response.data.data[0];

      const transformed = transformOrder(apiOrder);

      return transformed;
    } catch (error: any) {
      console.error("=== ERROR FETCHING ORDER ===");
      console.error("Error message:", error.message);

      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });

        // Log URL Ä‘ang gá»i
        console.error("Request URL:", error.config?.url);
      }

      return null;
    }
  },

  // Láº¥y thá»‘ng kÃª
  async getOrderStats() {
    try {
      const response = await api.get(`${API_URL}/stats`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching stats:", error);
      return null;
    }
  },

  // Update status order
  async updateOrderStatus(
    orderId: string,
    newStatus: Order["status"],
  ): Promise<boolean> {
    try {
      // Map status ngÆ°á»£c láº¡i tá»« FE sang BE
      const statusMapToBackend: Record<Order["status"], string> = {
        created: "created",
        packaging: "packaging",
        ready_to_ship: "ready_to_ship",
        shipping: "shipping",
        delivered: "delivered",
        completed: "completed",
        returned: "returned",
        cancelled: "cancelled",
        failed: "failed",
      };

      const backendStatus = statusMapToBackend[newStatus];

      const response = await api.patch(`${API_URL}/${orderId}/status`, {
        status: backendStatus,
      });

      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.response?.data);
      }
      return false;
    }
  },

  // Helper functions export náº¿u cáº§n
  mapStatus,
  mapPaymentStatus,
  formatDate,
  formatFullDate,
};
