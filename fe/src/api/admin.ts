// src/api/admin.ts
import api from '../lib/axios';

export interface DashboardStats {
    users: {
        total: number;
        buyers: number;
        sellers: number;
        admins: number;
        active: number;
        banned: number;
        newLast7Days: number;
    };
    products: {
        total: number;
        newLast7Days: number;
    };
    orders: {
        total: number;
        byStatus: Record<string, number>;
        newLast7Days: number;
    };
}

export interface DashboardStatsResponse {
    success: boolean;
    data: DashboardStats;
}

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

// Get dashboard stats
export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
    const response = await api.get('/api/admin/dashboard/stats');
    return response.data;
};

// Get all users
export const getAllUsers = async (params: GetUsersParams = {}): Promise<GetUsersResponse> => {
    const response = await api.get('/api/admin/users', { params });
    return response.data;
};

// Get user detail
export const getUserDetail = async (userId: string): Promise<UserDetailResponse> => {
    const response = await api.get(`/api/admin/users/${userId}`);
    return response.data;
};

// Update user
export const updateUser = async (
    userId: string,
    data: { username?: string; email?: string; role?: string }
) => {
    const response = await api.put(`/api/admin/users/${userId}`, data);
    return response.data;
};

// Delete user
export const deleteUser = async (userId: string) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
};

// Ban user
export const banUser = async (userId: string, reason: string) => {
    const response = await api.post(`/api/admin/users/${userId}/ban`, { reason });
    return response.data;
};

// Unban user
export const unbanUser = async (userId: string) => {
    const response = await api.post(`/api/admin/users/${userId}/unban`, {});
    return response.data;
};
