// src/api/admin-products.ts
import api from '../lib/axios';

// Product Management
export interface Product {
    _id: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    image?: string; // Main image from database
    images: string[]; // Additional images
    condition: string;
    status: string;
    sellerId: {
        _id: string;
        username: string;
        email: string;
    };
    categoryId: {
        _id: string;
        name: string;
    };
    averageRating: number;
    ratingCount: number;
    isAuction: boolean;
    auctionEndTime: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface GetProductsParams {
    page?: number;
    limit?: number;
    search?: string;
    sellerId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
}

export interface GetProductsResponse {
    success: boolean;
    data: Product[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Get all products
export const getAllProducts = async (params: GetProductsParams = {}): Promise<GetProductsResponse> => {
    const response = await api.get('/admin/products', { params });
    return response.data;
};

// Get product detail
export const getProductDetail = async (productId: string) => {
    const response = await api.get(`/admin/products/${productId}`);
    return response.data;
};

// Update product
export const updateProduct = async (
    productId: string,
    data: { title?: string; description?: string; price?: number; stock?: number }
) => {
    const response = await api.put(`/admin/products/${productId}`, data);
    return response.data;
};

// Delete product
export const deleteProduct = async (productId: string) => {
    const response = await api.delete(`/admin/products/${productId}`);
    return response.data;
};
