const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const feedbackRevisionService = require('../services/feedbackRevisionService');

// ==================== SELLER ENDPOINTS ====================

/**
 * Create revision request
 * POST /api/feedback-revision/request
 */
router.post('/request', auth, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: 'Only sellers can request feedback revision' });
        }

        const { reviewId, reason, message, resolutionType, resolutionProof } = req.body;

        if (!reviewId || !reason || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const request = await feedbackRevisionService.createRevisionRequest({
            reviewId,
            sellerId: req.user._id,
            reason,
            message,
            resolutionType,
            resolutionProof,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(201).json({
            success: true,
            message: request.flaggedForReview
                ? 'Request created but flagged for admin review due to potential policy violation'
                : 'Revision request sent successfully',
            data: request,
            warning: request.flaggedForReview ? request.flagReason : null
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message });
    }
});

/**
 * Get seller's requests
 * GET /api/feedback-revision/seller/requests
 */
router.get('/seller/requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { status, limit, skip } = req.query;

        const requests = await feedbackRevisionService.getSellerRequests(req.user._id, {
            status,
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0
        });

        return res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Cancel request
 * DELETE /api/feedback-revision/request/:id
 */
router.delete('/request/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const request = await feedbackRevisionService.cancelRequest(req.params.id, req.user._id);

        return res.json({
            success: true,
            message: 'Request cancelled successfully',
            data: request
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message });
    }
});

// ==================== BUYER ENDPOINTS ====================

/**
 * Get buyer's requests
 * GET /api/feedback-revision/buyer/requests
 */
router.get('/buyer/requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { status, limit, skip } = req.query;

        const requests = await feedbackRevisionService.getBuyerRequests(req.user._id, {
            status,
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0
        });

        return res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Respond to request (accept/decline)
 * POST /api/feedback-revision/request/:id/respond
 */
router.post('/request/:id/respond', auth, async (req, res) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { responseType, message } = req.body;

        if (!responseType || !['accepted', 'declined'].includes(responseType)) {
            return res.status(400).json({ message: 'Invalid response type' });
        }

        const request = await feedbackRevisionService.respondToRequest(
            req.params.id,
            req.user._id,
            { responseType, message }
        );

        return res.json({
            success: true,
            message: `Request ${responseType} successfully`,
            data: request
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message });
    }
});

/**
 * Apply revision (edit feedback)
 * POST /api/feedback-revision/request/:id/apply
 */
router.post('/request/:id/apply', auth, async (req, res) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid rating' });
        }

        const review = await feedbackRevisionService.applyRevision(
            req.params.id,
            req.user._id,
            { rating, comment }
        );

        return res.json({
            success: true,
            message: 'Feedback revised successfully',
            data: review
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message });
    }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get all requests (admin)
 * GET /api/feedback-revision/admin/requests
 */
router.get('/admin/requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { limit, skip } = req.query;

        const FeedbackRevisionRequest = require('../models/FeedbackRevisionRequest');
        const requests = await FeedbackRevisionRequest.find({})
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) || 100)
            .skip(parseInt(skip) || 0)
            .populate('review')
            .populate('seller', 'username')
            .populate('buyer', 'username')
            .populate('reviewedByAdmin', 'username')
            .lean();

        return res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get flagged requests (admin)
 * GET /api/feedback-revision/admin/flagged
 */
router.get('/admin/flagged', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { limit, skip } = req.query;

        const requests = await feedbackRevisionService.getFlaggedRequests({
            limit: parseInt(limit) || 100,
            skip: parseInt(skip) || 0
        });

        return res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Review request (admin)
 * POST /api/feedback-revision/admin/:id/review
 */
router.post('/admin/:id/review', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { action, notes } = req.body;

        if (!action || !['approved', 'rejected', 'cancelled_feedback', 'warned_seller'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action' });
        }

        const request = await feedbackRevisionService.adminReviewRequest(
            req.params.id,
            req.user._id,
            { action, notes }
        );

        return res.json({
            success: true,
            message: `Request ${action} successfully`,
            data: request
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message });
    }
});

/**
 * Validate message for violations (helper endpoint)
 * POST /api/feedback-revision/validate-message
 */
router.post('/validate-message', auth, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const validation = feedbackRevisionService.validateMessage(message);

        return res.json({
            success: true,
            data: validation
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
