import api from '@/lib/axios';

/**
 * Feedback Revision API Client
 */

// ==================== SELLER ====================

/**
 * Create revision request
 */
export const createRevisionRequest = async (data: {
    reviewId: string;
    reason: string;
    message: string;
    resolutionType?: string;
    resolutionProof?: string;
}) => {
    return await api.post('/api/v1/feedback-revision/request', data);
};

/**
 * Get seller's requests
 */
export const getSellerRequests = async (params?: {
    status?: string;
    limit?: number;
    skip?: number;
}) => {
    return await api.get('/api/v1/feedback-revision/seller/requests', { params });
};

/**
 * Cancel request
 */
export const cancelRevisionRequest = async (requestId: string) => {
    return await api.delete(`/api/v1/feedback-revision/request/${requestId}`);
};

// ==================== BUYER ====================

/**
 * Get buyer's requests
 */
export const getBuyerRequests = async (params?: {
    status?: string;
    limit?: number;
    skip?: number;
}) => {
    return await api.get('/api/v1/feedback-revision/buyer/requests', { params });
};

/**
 * Respond to request
 */
export const respondToRequest = async (requestId: string, data: {
    responseType: 'accepted' | 'declined';
    message?: string;
}) => {
    return await api.post(`/api/v1/feedback-revision/request/${requestId}/respond`, data);
};

/**
 * Apply revision (edit feedback)
 */
export const applyRevision = async (requestId: string, data: {
    rating: number;
    comment: string;
}) => {
    return await api.post(`/api/v1/feedback-revision/request/${requestId}/apply`, data);
};

// ==================== ADMIN ====================

/**
 * Get all requests (admin)
 */
export const getAdminRequests = async (params?: {
    limit?: number;
    skip?: number;
}) => {
    return await api.get('/api/v1/feedback-revision/admin/requests', { params });
};

/**
 * Get flagged requests (admin)
 */
export const getFlaggedRequests = async (params?: {
    limit?: number;
    skip?: number;
}) => {
    return await api.get('/api/v1/feedback-revision/admin/flagged', { params });
};

/**
 * Review request (admin)
 */
export const adminReviewRequest = async (requestId: string, data: {
    action: 'approved' | 'rejected' | 'cancelled_feedback' | 'warned_seller';
    notes?: string;
}) => {
    return await api.post(`/api/v1/feedback-revision/admin/${requestId}/review`, data);
};

// ==================== HELPER ====================

/**
 * Validate message for violations
 */
export const validateMessage = async (message: string) => {
    return await api.post('/api/v1/feedback-revision/validate-message', { message });
};
