// src/api/admin.ts
import api from '../lib/axios';

export interface User {
    _id: string;
    username: string;
    email: string;
    role: 'buyer' | 'seller' | 'admin';
    status: 'active' | 'banned' | 'suspended' | 'restricted';
    reputationScore: number;
    isEmailVerified: boolean;
    bannedAt?: Date;
    bannedBy?: string;
    banReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    excludeAdmin?: boolean;
    newUsers?: boolean;
}

export interface GetUsersResponse {
    success: boolean;
    data: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface UserDetailResponse {
    success: boolean;
    data: User & {
        statistics: {
            ordersBought: number;
            ordersSold: number;
            reviewsGiven: number;
            reviewsReceived: number;
            complaintsAsBuyer: number;
            complaintsAsSeller: number;
        };
    };
}

// Get all users
export const getAllUsers = async (params: GetUsersParams = {}): Promise<GetUsersResponse> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
};

// Get user detail
export const getUserDetail = async (userId: string): Promise<UserDetailResponse> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
};

// Update user
export const updateUser = async (
    userId: string,
    data: { username?: string; email?: string; role?: string }
) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
};

// Delete user
export const deleteUser = async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
};

// Ban user
export const banUser = async (userId: string, reason: string) => {
    const response = await api.post(`/admin/users/${userId}/ban`, { reason });
    return response.data;
};

// Unban user
export const unbanUser = async (userId: string) => {
    const response = await api.post(`/admin/users/${userId}/unban`, {});
    return response.data;
};
