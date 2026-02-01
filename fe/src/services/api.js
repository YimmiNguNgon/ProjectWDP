import axios from 'axios';

// Vite sử dụng import.meta.env thay vì process.env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Tạo axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('token');
      window.location.href = '/auth/sign-in';
    }
    
    return Promise.reject(error);
  }
);

// API cho product
export const productAPI = {
  // Tạo sản phẩm mới
  createProduct: async (formData) => {
    const response = await api.post('/api/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Lấy danh sách sản phẩm
  getProducts: async (params) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  // Lấy sản phẩm của seller hiện tại
  getSellerProducts: async (params) => {
    const response = await api.get('/api/products/seller/my-products', { params });
    return response.data;
  },

  // Lấy danh mục
  getCategories: async () => {
    const response = await api.get('/api/products/categories');
    return response.data;
  },

  // Lấy chi tiết sản phẩm
  getProduct: async (productId) => {
    const response = await api.get(`/api/products/${productId}`);
    return response.data;
  },

  // Cập nhật sản phẩm
  updateProduct: async (productId, formData) => {
    const response = await api.put(`/api/products/${productId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa sản phẩm
  deleteProduct: async (productId) => {
    const response = await api.delete(`/api/products/${productId}`);
    return response.data;
  },
};

// API cho orders
export const orderAPI = {
  // Lấy danh sách đơn hàng của seller
  getSellerOrders: async (params) => {
    const response = await api.get('/api/orders', { params });
    return response.data;
  },

  // Lấy chi tiết đơn hàng
  getOrderDetail: async (orderId) => {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data;
  },

  // Cập nhật trạng thái đơn hàng
  updateOrderStatus: async (orderId, statusData) => {
    const response = await api.put(`/api/orders/${orderId}/status`, statusData);
    return response.data;
  },

  // Lấy thống kê doanh thu
  getRevenueStats: async (params) => {
    const response = await api.get('/api/orders/stats/revenue', { params });
    return response.data;
  }
};

// API cho authentication
export const authAPI = {
  // Đăng nhập
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  // Đăng ký
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Đổi mật khẩu
  changePassword: async (oldPassword, newPassword) => {
    const response = await api.post('/api/auth/change-password', { oldPassword, newPassword });
    return response.data;
  },
};

// API cho user
export const userAPI = {
  // Lấy thông tin user
  getUser: async (userId) => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  // Cập nhật thông tin user
  updateUser: async (userId, userData) => {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (formData) => {
    const response = await api.post('/api/users/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// API upload ảnh lên Cloudinary (cho Vite)
export const uploadAPI = {
  // Upload ảnh lên Cloudinary
  uploadToCloudinary: async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );
      return response.data;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Upload ảnh thất bại');
    }
  },

  // Upload nhiều ảnh
  uploadMultipleImages: async (files) => {
    const uploadPromises = files.map(file => 
      uploadAPI.uploadToCloudinary(file).catch(error => {
        console.error('Failed to upload image:', error);
        return null;
      })
    );
    
    const results = await Promise.all(uploadPromises);
    // Lọc bỏ những upload thất bại
    return results.filter(result => result !== null);
  }
};

export const reviewsAPI = {
  // Lấy danh sách reviews của seller
  getSellerReviews: async (params) => {
    const response = await api.get('/api/reviews/seller', { params });
    return response.data;
  },

  // Duyệt review
  approveReview: async (reviewId) => {
    const response = await api.put(`/api/reviews/${reviewId}/approve`);
    return response.data;
  },

  // Từ chối review
  rejectReview: async (reviewId) => {
    const response = await api.put(`/api/reviews/${reviewId}/reject`);
    return response.data;
  },

  // Phản hồi review
  replyToReview: async (reviewId, replyData) => {
    const response = await api.post(`/api/reviews/${reviewId}/reply`, replyData);
    return response.data;
  },

  // Đánh dấu hữu ích
  markHelpful: async (reviewId) => {
    const response = await api.put(`/api/reviews/${reviewId}/helpful`);
    return response.data;
  }
};

export default api;
export { productAPI, orderAPI, authAPI, userAPI, uploadAPI };