const FeedbackRevisionRequest = require('../models/FeedbackRevisionRequest');
const Review = require('../models/Review');
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Feedback Revision Service (eBay-style)
 * Handles seller requests to revise buyer feedback
 */
class FeedbackRevisionService {

    /**
     * Extortion/Violation keywords
     */
    VIOLATION_KEYWORDS = {
        conditional_refund: [
            'nếu không sửa',
            'sửa rồi mới',
            'sửa feedback rồi tôi mới',
            'không sửa thì không',
            'sửa thì mới refund',
            'sửa mới gửi',
            'if you don\'t revise',
            'revise then i will'
        ],
        threats: [
            'report bạn',
            'báo cáo bạn',
            'tài khoản bạn sẽ',
            'ảnh hưởng đến bạn',
            'bạn sẽ bị',
            'i will report you',
            'your account will'
        ],
        pressure: [
            'phải sửa',
            'bắt buộc sửa',
            'cần sửa ngay',
            'must revise',
            'have to revise',
            'required to revise'
        ]
    };

    /**
     * Validate request message for violations
     * @param {string} message - Request message
     * @returns {Object} - { isValid, violations, flagReason }
     */
    validateMessage(message) {
        if (!message) {
            return { isValid: false, violations: [], flagReason: 'Message is required' };
        }

        const lowerMessage = message.toLowerCase();
        const violations = [];
        const detectedKeywords = [];

        // Check for extortion keywords
        for (const [category, keywords] of Object.entries(this.VIOLATION_KEYWORDS)) {
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword.toLowerCase())) {
                    violations.push(category);
                    detectedKeywords.push(keyword);
                }
            }
        }

        if (violations.length > 0) {
            const uniqueViolations = [...new Set(violations)];
            return {
                isValid: false,
                violations: uniqueViolations,
                detectedKeywords,
                flagReason: `Potential extortion detected: ${uniqueViolations.join(', ')}`
            };
        }

        return { isValid: true, violations: [], detectedKeywords: [] };
    }

    /**
     * Create revision request
     * @param {Object} params - { reviewId, sellerId, reason, message, resolutionType, resolutionProof }
     * @returns {Object} - Created request
     */
    async createRevisionRequest(params) {
        const {
            reviewId,
            sellerId,
            reason,
            message,
            resolutionType,
            resolutionProof,
            ipAddress,
            userAgent
        } = params;

        try {
            // 1. Validate review exists and seller owns it
            const review = await Review.findById(reviewId).populate('order');
            if (!review) {
                throw new Error('Review not found');
            }

            if (review.seller.toString() !== sellerId.toString()) {
                throw new Error('You can only request revision for your own reviews');
            }

            // 2. Check if review is too old (60 days)
            const reviewAge = Date.now() - new Date(review.createdAt).getTime();
            const maxAge = 60 * 24 * 60 * 60 * 1000; // 60 days
            if (reviewAge > maxAge) {
                throw new Error('Cannot request revision for reviews older than 60 days');
            }

            // 3. Check if seller can request (rate limiting)
            const canRequest = await FeedbackRevisionRequest.canSellerRequest(sellerId, reviewId);
            if (!canRequest.allowed) {
                throw new Error(canRequest.reason);
            }

            // 4. Validate message for violations
            const validation = this.validateMessage(message);

            // 5. Create request
            const requestData = {
                review: reviewId,
                seller: sellerId,
                buyer: review.reviewer,
                order: review.order._id,
                reason,
                message,
                resolutionType,
                resolutionProof,
                flaggedForReview: !validation.isValid,
                ipAddress,
                userAgent
            };

            // Only set flagReason and violationKeywords if there is a violation
            if (!validation.isValid) {
                requestData.flagReason = 'extortion_detected';
                requestData.violationKeywords = validation.detectedKeywords;
            }

            const request = await FeedbackRevisionRequest.create(requestData);

            // 6. Update review
            review.revisionRequested = true;
            review.revisionRequest = request._id;
            await review.save();

            console.log(`Revision request created: ${request._id}`);
            if (!validation.isValid) {
                console.warn(`Request flagged for review: ${validation.flagReason}`);
            }

            return request;
        } catch (err) {
            console.error('createRevisionRequest error:', err);
            throw err;
        }
    }

    /**
     * Buyer responds to revision request
     * @param {string} requestId - Request ID
     * @param {string} buyerId - Buyer ID
     * @param {Object} response - { responseType, message }
     */
    async respondToRequest(requestId, buyerId, response) {
        const { responseType, message } = response;

        try {
            const request = await FeedbackRevisionRequest.findById(requestId);
            if (!request) {
                throw new Error('Request not found');
            }

            if (request.buyer.toString() !== buyerId.toString()) {
                throw new Error('Unauthorized');
            }

            if (request.status !== 'pending') {
                throw new Error('Request is no longer pending');
            }

            // Check if expired
            if (request.expiresAt < new Date()) {
                request.status = 'expired';
                await request.save();
                throw new Error('Request has expired');
            }

            request.buyerResponseType = responseType;
            request.buyerResponse = message;
            request.respondedAt = new Date();
            request.status = responseType === 'accepted' ? 'accepted' : 'declined';
            await request.save();

            console.log(`Buyer ${buyerId} ${responseType} revision request ${requestId}`);

            return request;
        } catch (err) {
            console.error('respondToRequest error:', err);
            throw err;
        }
    }

    /**
     * Apply revision to feedback (buyer edits feedback)
     * @param {string} requestId - Request ID
     * @param {string} buyerId - Buyer ID
     * @param {Object} revision - { rating, comment }
     */
    async applyRevision(requestId, buyerId, revision) {
        const { rating, comment } = revision;

        try {
            const request = await FeedbackRevisionRequest.findById(requestId);
            if (!request) {
                throw new Error('Request not found');
            }

            if (request.buyer.toString() !== buyerId.toString()) {
                throw new Error('Unauthorized');
            }

            if (request.status !== 'accepted') {
                throw new Error('Request must be accepted first');
            }

            // Get review
            const review = await Review.findById(request.review);
            if (!review) {
                throw new Error('Review not found');
            }

            // Save original if not already saved
            if (!review.originalRating) {
                review.originalRating = review.rating;
                review.originalComment = review.comment;
            }

            // Add to revision history
            review.revisionHistory.push({
                rating: review.rating,
                comment: review.comment,
                revisedAt: new Date()
            });

            // Apply new rating/comment
            review.rating = rating;
            review.comment = comment;
            review.revisedAt = new Date();

            // Update type based on new rating
            if (rating >= 4) review.type = 'positive';
            else if (rating === 3) review.type = 'neutral';
            else review.type = 'negative';

            await review.save();

            console.log(`Feedback revised for review ${review._id}`);

            return review;
        } catch (err) {
            console.error('applyRevision error:', err);
            throw err;
        }
    }

    /**
     * Cancel revision request (seller)
     * @param {string} requestId - Request ID
     * @param {string} sellerId - Seller ID
     */
    async cancelRequest(requestId, sellerId) {
        try {
            const request = await FeedbackRevisionRequest.findById(requestId);
            if (!request) {
                throw new Error('Request not found');
            }

            if (request.seller.toString() !== sellerId.toString()) {
                throw new Error('Unauthorized');
            }

            if (request.status !== 'pending') {
                throw new Error('Can only cancel pending requests');
            }

            request.status = 'cancelled';
            await request.save();

            // Update review
            await Review.findByIdAndUpdate(request.review, {
                revisionRequested: false,
                revisionRequest: null
            });

            console.log(`Request ${requestId} cancelled by seller`);

            return request;
        } catch (err) {
            console.error('cancelRequest error:', err);
            throw err;
        }
    }

    /**
     * Admin review flagged request
     * @param {string} requestId - Request ID
     * @param {string} adminId - Admin ID
     * @param {Object} action - { action, notes }
     */
    async adminReviewRequest(requestId, adminId, actionData) {
        const { action, notes } = actionData;

        try {
            const request = await FeedbackRevisionRequest.findById(requestId);
            if (!request) {
                throw new Error('Request not found');
            }

            request.reviewedByAdmin = adminId;
            request.adminNotes = notes;
            request.adminAction = action;
            request.adminActionAt = new Date();

            if (action === 'rejected' || action === 'cancelled_feedback') {
                request.status = 'cancelled';
                request.flaggedForReview = false;
            } else if (action === 'approved') {
                request.flaggedForReview = false;
            }

            await request.save();

            // If admin cancelled feedback, mark review as deleted
            if (action === 'cancelled_feedback') {
                await Review.findByIdAndUpdate(request.review, {
                    deletedAt: new Date(),
                    deletedBy: adminId,
                    flagReason: 'Seller violated feedback revision policy'
                });
            }

            console.log(`Admin ${adminId} ${action} request ${requestId}`);

            return request;
        } catch (err) {
            console.error('adminReviewRequest error:', err);
            throw err;
        }
    }

    /**
     * Get seller's requests
     */
    async getSellerRequests(sellerId, options = {}) {
        const { status, limit = 50, skip = 0 } = options;

        const query = { seller: sellerId };
        if (status) query.status = status;

        return await FeedbackRevisionRequest.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('review')
            .populate('buyer', 'username')
            .lean();
    }

    /**
     * Get buyer's requests
     */
    async getBuyerRequests(buyerId, options = {}) {
        const { status, limit = 50, skip = 0 } = options;

        const query = { buyer: buyerId };
        if (status) query.status = status;

        return await FeedbackRevisionRequest.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('review')
            .populate('seller', 'username')
            .lean();
    }

    /**
     * Get flagged requests (admin)
     */
    async getFlaggedRequests(options = {}) {
        const { limit = 100, skip = 0 } = options;

        return await FeedbackRevisionRequest.find({ flaggedForReview: true })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('review')
            .populate('seller', 'username')
            .populate('buyer', 'username')
            .populate('reviewedByAdmin', 'username')
            .lean();
    }

    /**
     * Expire old pending requests (cron job)
     */
    async expireOldRequests() {
        try {
            const result = await FeedbackRevisionRequest.updateMany(
                {
                    status: 'pending',
                    expiresAt: { $lt: new Date() }
                },
                {
                    $set: { status: 'expired' }
                }
            );

            console.log(`Expired ${result.modifiedCount} old requests`);
            return result;
        } catch (err) {
            console.error('expireOldRequests error:', err);
            throw err;
        }
    }
}

module.exports = new FeedbackRevisionService();
