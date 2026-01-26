// services/orderService.ts
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/orders';

interface ApiOrder {
  _id: string;
  orderId?: string;
  customer: string;
  email: string;
  total: number;
  status: 'created' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: string;
  paymentMethod: string;
  createdAt?: string;
}

interface Order {
  _id: string;
  customer: string;
  email: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: string;
  paymentMethod: string;
}

// Map status từ backend sang frontend
const mapStatus = (status: string): Order['status'] => {
  switch (status) {
    case 'created':
    case 'pending':
      return 'pending';
    case 'paid':
    case 'processing':
      return 'processing';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

// Format date từ backend (YYYY-MM-DD) sang DD/MM/YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Chuyển đổi dữ liệu từ API sang format FE
const transformOrder = (apiOrder: ApiOrder): Order => {
  return {
    _id: apiOrder.orderId || apiOrder._id, // Dùng orderId nếu có, không thì dùng _id
    customer: apiOrder.customer || 'Khách hàng',
    email: apiOrder.email || '',
    total: apiOrder.total || 0,
    status: mapStatus(apiOrder.status || 'pending'),
    items: apiOrder.items || 0,
    date: formatDate(apiOrder.date || apiOrder.createdAt || ''),
    paymentMethod: apiOrder.paymentMethod || 'Credit Card'
  };
};

export const orderService = {
  // Lấy tất cả orders
  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await axios.get(`${API_URL}/all`);
      const apiOrders: ApiOrder[] = response.data.data || [];
      return apiOrders.map(transformOrder);
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  // Lấy orders với filter và pagination
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    try {
      const response = await axios.get(API_URL, { params });
      const apiOrders: ApiOrder[] = response.data.data || [];
      const orders = apiOrders.map(transformOrder);
      
      return {
        orders,
        total: response.data.pagination?.total || orders.length
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { orders: [], total: 0 };
    }
  },

  // Lấy order theo ID
  async getOrderById(id: string): Promise<Order | null> {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      const apiOrder: ApiOrder = response.data.data;
      return transformOrder(apiOrder);
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  },

  // Lấy thống kê
  async getOrderStats() {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  },

  // Update status order
  async updateOrderStatus(orderId: string, newStatus: Order['status']): Promise<boolean> {
    try {
      // Map status ngược lại từ FE sang BE
      const statusMapToBackend: Record<Order['status'], string> = {
        'pending': 'created',
        'processing': 'paid',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      };
      
      const backendStatus = statusMapToBackend[newStatus];
      await axios.patch(`${API_URL}/${orderId}`, { status: backendStatus });
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }
};