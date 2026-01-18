// src/api/review.ts
import api from "@/lib/axios";

export interface AdminReviewsFilters {
    page?: number;
    limit?: number;
    filter?: "all" | "flagged" | "deleted" | "active";
}

export interface FlagReviewData {
    reason: string;
}

// Admin: Delete review (soft delete)
export const adminDeleteReview = async (reviewId: string) => {
    const res = await api.delete(`/reviews/${reviewId}/admin`);
    return res.data;
};

// User: Flag review for admin review
export const flagReview = async (reviewId: string, data: FlagReviewData) => {
    const res = await api.post(`/reviews/${reviewId}/flag`, data);
    return res.data;
};

// Admin: Get all reviews with filters
export const getAdminReviews = async (filters?: AdminReviewsFilters) => {
    const res = await api.get("/reviews/admin/all", { params: filters });
    return res.data;
};
