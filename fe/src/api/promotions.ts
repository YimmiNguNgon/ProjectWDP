import api from '@/lib/axios';

// ========== Types ==========
export interface PromotionRequest {
    _id: string;
    requestType: 'outlet' | 'daily_deal';
    product: {
        _id: string;
        title: string;
        image?: string;
        price: number;
        condition: string;
        createdAt: string;
        quantity: number;
    };
    seller: {
        _id: string;
        username: string;
        email: string;
        isEmailVerified: boolean;
    };
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    startDate?: string;
    endDate?: string;
    quantityLimit?: number;
    eligibilityChecks: {
        conditionNew: boolean;
        listingAge: number;
        listingAgeMet: boolean;
        discountMet: boolean;
        sellerVerified: boolean;
        allPassed: boolean;
    };
    reviewedBy?: string;
    reviewedAt?: string;
    adminNotes?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RequestOutletData {
    productId: string;
    discountedPrice: number;
}

export interface RequestDailyDealData {
    productId: string;
    discountedPrice: number;
    startDate: string;
    endDate: string;
    quantityLimit: number;
}

// ========== Seller APIs ==========

/**
 * Request Brand Outlet status for a product
 */
export async function requestOutlet(data: RequestOutletData) {
    const response = await api.post('/api/promotions/request/outlet', data);
    return response.data;
}

/**
 * Request Daily Deal status for a product
 */
export async function requestDailyDeal(data: RequestDailyDealData) {
    const response = await api.post('/api/promotions/request/daily-deal', data);
    return response.data;
}

/**
 * Get seller's promotion requests
 */
export async function getMyPromotionRequests(params?: {
    status?: string;
    type?: string;
}) {
    const response = await api.get<{ success: boolean; data: PromotionRequest[] }>(
        '/api/promotions/my-requests',
        { params }
    );
    return response.data;
}

/**
 * Cancel a pending promotion request
 */
export async function cancelPromotionRequest(requestId: string) {
    const response = await api.delete(`/api/promotions/request/${requestId}`);
    return response.data;
}

// ========== Admin APIs ==========

/**
 * Get pending promotion requests (Admin)
 */
export async function getPendingPromotionRequests(params?: { type?: string }) {
    const response = await api.get<{ success: boolean; data: PromotionRequest[] }>(
        '/api/promotions/admin/pending',
        { params }
    );
    return response.data;
}

/**
 * Get all promotion requests (Admin)
 */
export async function getAllPromotionRequests(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
}) {
    const response = await api.get<{
        success: boolean;
        data: PromotionRequest[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>('/api/promotions/admin/all', { params });
    return response.data;
}

/**
 * Approve a promotion request (Admin)
 */
export async function approvePromotionRequest(
    requestId: string,
    adminNotes?: string
) {
    const response = await api.post(`/api/promotions/admin/${requestId}/approve`, {
        adminNotes,
    });
    return response.data;
}

/**
 * Reject a promotion request (Admin)
 */
export async function rejectPromotionRequest(
    requestId: string,
    rejectionReason: string,
    adminNotes?: string
) {
    const response = await api.post(`/api/promotions/admin/${requestId}/reject`, {
        rejectionReason,
        adminNotes,
    });
    return response.data;
}
