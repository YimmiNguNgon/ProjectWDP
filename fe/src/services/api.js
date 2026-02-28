import axios from 'axios';

// Vite sá»­ dá»¥ng import.meta.env thay vÃ¬ process.env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Táº¡o axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor Ä‘á»ƒ thÃªm token
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

// Response interceptor Ä‘á»ƒ xá»­ lÃ½ lá»—i
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Token háº¿t háº¡n hoáº·c khÃ´ng há»£p lá»‡
      localStorage.removeItem('token');
      window.location.href = '/auth/sign-in';
    }
    
    return Promise.reject(error);
  }
);

// API cho product
export const productAPI = {
  // Táº¡o sáº£n pháº©m má»›i
  createProduct: async (formData) => {
    const response = await api.post('/api/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Láº¥y danh sÃ¡ch sáº£n pháº©m
  getProducts: async (params) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  // Láº¥y sáº£n pháº©m cá»§a seller hiá»‡n táº¡i
  getSellerProducts: async (params) => {
    const response = await api.get('/api/products/seller/my-products', { params });
    return response.data;
  },

  // Láº¥y danh má»¥c
  getCategories: async () => {
    const response = await api.get('/api/products/categories');
    return response.data;
  },

  // Láº¥y chi tiáº¿t sáº£n pháº©m
  getProduct: async (productId) => {
    const response = await api.get(`/api/products/${productId}`);
    return response.data;
  },

  // Cáº­p nháº­t sáº£n pháº©m
  updateProduct: async (productId, formData) => {
    const response = await api.put(`/api/products/${productId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // XÃ³a sáº£n pháº©m
  deleteProduct: async (productId) => {
    const response = await api.delete(`/api/products/${productId}`);
    return response.data;
  },
};

// API cho orders
export const orderAPI = {
  // Láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng cá»§a seller
  getSellerOrders: async (params) => {
    const response = await api.get('/api/orders', { params });
    return response.data;
  },

  // Láº¥y chi tiáº¿t Ä‘Æ¡n hÃ ng
  getOrderDetail: async (orderId) => {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data;
  },

  // Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
  updateOrderStatus: async (orderId, statusData) => {
    const response = await api.put(`/api/orders/${orderId}/status`, statusData);
    return response.data;
  },

  // Láº¥y thá»‘ng kÃª doanh thu
  getRevenueStats: async (params) => {
    const response = await api.get('/api/orders/stats/revenue', { params });
    return response.data;
  }
};

// API cho authentication
export const authAPI = {
  // ÄÄƒng nháº­p
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  // ÄÄƒng kÃ½
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  // Láº¥y thÃ´ng tin user hiá»‡n táº¡i
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Äá»•i máº­t kháº©u
  changePassword: async (oldPassword, newPassword) => {
    const response = await api.post('/api/auth/change-password', { oldPassword, newPassword });
    return response.data;
  },
};

// API cho user
export const userAPI = {
  // Láº¥y thÃ´ng tin user
  getUser: async (userId) => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  // Cáº­p nháº­t thÃ´ng tin user
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

// API upload áº£nh lÃªn Cloudinary (cho Vite)
export const uploadAPI = {
  // Upload áº£nh lÃªn Cloudinary
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
      throw new Error('Image upload failed');
    }
  },

  // Upload nhiá»u áº£nh
  uploadMultipleImages: async (files) => {
    const uploadPromises = files.map(file => 
      uploadAPI.uploadToCloudinary(file).catch(error => {
        console.error('Failed to upload image:', error);
        return null;
      })
    );
    
    const results = await Promise.all(uploadPromises);
    // Lá»c bá» nhá»¯ng upload tháº¥t báº¡i
    return results.filter(result => result !== null);
  }
};

export const reviewsAPI = {
  // Láº¥y danh sÃ¡ch reviews cá»§a seller
  getSellerReviews: async (params) => {
    const response = await api.get('/api/reviews/seller', { params });
    return response.data;
  },

  // Duyá»‡t review
  approveReview: async (reviewId) => {
    const response = await api.put(`/api/reviews/${reviewId}/approve`);
    return response.data;
  },

  // Tá»« chá»‘i review
  rejectReview: async (reviewId) => {
    const response = await api.put(`/api/reviews/${reviewId}/reject`);
    return response.data;
  },

  // Pháº£n há»“i review
  replyToReview: async (reviewId, replyData) => {
    const response = await api.post(`/api/reviews/${reviewId}/reply`, replyData);
    return response.data;
  },

  // ÄÃ¡nh dáº¥u há»¯u Ã­ch
  markHelpful: async (reviewId) => {
    const response = await api.put(`/api/reviews/${reviewId}/helpful`);
    return response.data;
  }
};

export default api;
export { productAPI, orderAPI, authAPI, userAPI, uploadAPI };
