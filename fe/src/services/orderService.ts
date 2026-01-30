// services/orderService.ts
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/orders';

// Cập nhật interface ApiOrder để bao gồm tất cả trường từ backend
interface ApiOrder {
  _id: string;
  orderId?: string;
  username: string;
  email: string;
  total: number;
  status: 'created' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  items: any; // Can be array or number depending on backend version
  itemCount?: number;
  date: string;
  paymentMethod: string;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  address?: string;
  seller?: string;
  orderDetails?: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
}

// Cập nhật interface Order cho FE
interface Order {
  _id: string;
  username: string;
  email: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: string;
  paymentMethod: string;
  phone?: string;
  address?: string;
  orderDetails?: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Map status từ backend sang frontend
const mapStatus = (status: string): Order['status'] => {
  switch (status.toLowerCase()) {
    case 'created':
    case 'pending':
      return 'pending';
    case 'paid':
    case 'processing':
      return 'processing';
    case 'shipped':
    case 'shipping':
      return 'shipped';
    case 'delivered':
    case 'completed':
      return 'delivered';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      console.warn('Unknown status:', status);
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

// Format date đầy đủ cho popup (DD/MM/YYYY HH:MM)
const formatFullDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Chuyển đổi dữ liệu từ API sang format FE
const transformOrder = (apiOrder: ApiOrder): Order => {
  return {
    _id: apiOrder.orderId || apiOrder._id, 
    username: apiOrder.username || 'Khách hàng',
    email: apiOrder.email || '',
    total: apiOrder.total || 0,
    status: mapStatus(apiOrder.status || 'pending'),
    items: apiOrder.itemCount || (Array.isArray(apiOrder.items) ? apiOrder.items.length : apiOrder.items) || 0,
    date: formatDate(apiOrder.date || apiOrder.createdAt || ''),
    paymentMethod: apiOrder.paymentMethod || 'Credit Card',
    phone: apiOrder.phone || '',
    address: apiOrder.address || '',
    orderDetails: apiOrder.orderDetails || [],
    createdAt: apiOrder.createdAt,
    updatedAt: apiOrder.updatedAt
  };
};

export const orderService = {
  // Lấy tất cả orders
  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await axios.get(`${API_URL}/all`);
      console.log('All orders response:', response.data); // Debug
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
      console.log('Filtered orders response:', response.data); // Debug
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

  // Lấy chi tiết order theo ID
  async getOrderById(id: string): Promise<Order | null> {
  try {
    console.log('=== FETCHING ORDER DETAILS ===');
    console.log('Original ID:', id);
    
    // Test với ObjectId trực tiếp từ data bạn đã insert
    // Dữ liệu bạn đã insert: "60d21b4667d0d8992e610cae"
    // #ORD610CAE → phần cuối là "610cae"
    
    let actualId = id;
    
    if (id.startsWith('#ORD')) {
      // #ORD610CAE → "610cae"
      const hexPart = id.replace('#ORD', '').toLowerCase();
      console.log('Hex part from #ORD:', hexPart); // Should be "610cae"
      
      // Kiểm tra độ dài hexPart
      if (hexPart.length === 6) {
        // Tạo ObjectId đầy đủ 24 ký tự hex
        // "60d21b4667d0d8992e610cae" - 24 characters
        actualId = `60d21b4667d0d8992e${hexPart}`;
      } else {
        console.error('Invalid hex part length:', hexPart);
        return null;
      }
    }
    
    console.log('Converted ID for API call:', actualId);
    console.log('API URL:', `${API_URL}/${actualId}`);
    
    // Thử call API
    const response = await axios.get(`${API_URL}/${actualId}`);
    console.log('API Response:', response.data);
    
    if (!response.data.success) {
      console.error('API returned failure:', response.data.message);
      return null;
    }
    
    // Kiểm tra cấu trúc response
    if (!response.data.data) {
      console.error('No data in response');
      return null;
    }
    
    const apiOrder = response.data.data;
    console.log('API Order object:', apiOrder);
    
    const transformed = transformOrder(apiOrder);
    console.log('Transformed order:', transformed);
    
    return transformed;
    
  } catch (error: any) {
    console.error('=== ERROR FETCHING ORDER ===');
    console.error('Error message:', error.message);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Log URL đang gọi
      console.error('Request URL:', error.config?.url);
    }
    
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
      console.log('Updating order status:', { orderId, newStatus, backendStatus });
      
      const response = await axios.patch(`${API_URL}/${orderId}`, { 
        status: backendStatus 
      });
      
      console.log('Update response:', response.data);
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.response?.data);
      }
      return false;
    }
  },

  // Helper functions export nếu cần
  mapStatus,
  formatDate,
  formatFullDate
};