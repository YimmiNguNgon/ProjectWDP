// src/api/feedback-revision.ts
import api from '../lib/axios';

export interface FeedbackRevisionRequest {
    _id: string;
    review: {
        _id: string;
        rating: number;
        comment: string;
    };
    seller: {
        _id: string;
        username: string;
    };
    buyer: {
        _id: string;
        username: string;
    };
    order: string;
    reason: string;
    message: string;
    resolutionType?: string;
    resolutionProof?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    buyerResponse?: string;
    buyerResponseType?: 'accepted' | 'declined' | 'ignored';
    respondedAt?: Date;
    flaggedForReview: boolean;
    flagReason?: string;
    violationKeywords?: string[];
    reviewedByAdmin?: {
        _id: string;
        username: string;
    };
    adminNotes?: string;
    adminAction?: 'approved' | 'rejected' | 'cancelled_feedback' | 'warned_seller';
    adminActionAt?: Date;
    createdAt: Date;
    expiresAt: Date;
}

export interface GetFeedbackRequestsResponse {
    success: boolean;
    data: FeedbackRevisionRequest[];
}

// Get all feedback revision requests (admin)
export const getAllFeedbackRequests = async (params?: { limit?: number; skip?: number }): Promise<GetFeedbackRequestsResponse> => {
    const response = await api.get('/api/feedback-revision/admin/requests', { params });
    return response.data;
};

// Get flagged feedback requests (admin)
export const getFlaggedFeedbackRequests = async (params?: { limit?: number; skip?: number }): Promise<GetFeedbackRequestsResponse> => {
    const response = await api.get('/api/feedback-revision/admin/flagged', { params });
    return response.data;
};

// Review feedback request (admin)
export const reviewFeedbackRequest = async (
    requestId: string,
    data: {
        action: 'approved' | 'rejected' | 'cancelled_feedback' | 'warned_seller';
        notes?: string;
    }
) => {
    const response = await api.post(`/api/feedback-revision/admin/${requestId}/review`, data);
    return response.data;
};
