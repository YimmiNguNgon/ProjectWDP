const mongoose = require('mongoose');

/**
 * Feedback Revision Request Schema
 * Allows sellers to request buyers to revise their feedback (eBay-style)
 */
const feedbackRevisionRequestSchema = new mongoose.Schema({
    // Reference to the review
    review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        required: true,
        index: true
    },

    // Parties involved
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },

    // Request details
    reason: {
        type: String,
        required: true,
        enum: ['refund', 'replacement', 'resolved', 'misunderstanding', 'other']
    },

    message: {
        type: String,
        required: true,
        maxlength: 1000
    },

    // Resolution proof
    resolutionType: {
        type: String,
        enum: ['full_refund', 'partial_refund', 'replacement_sent', 'issue_resolved']
    },

    resolutionProof: {
        type: String,
        maxlength: 500
    },

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Buyer response
    buyerResponse: {
        type: String,
        maxlength: 500
    },

    buyerResponseType: {
        type: String,
        enum: ['accepted', 'declined', 'ignored']
    },

    respondedAt: Date,

    // Admin oversight
    flaggedForReview: {
        type: Boolean,
        default: false,
        index: true
    },

    flagReason: {
        type: String,
        enum: [
            'extortion_detected',
            'spam',
            'inappropriate_content',
            'buyer_reported',
            'manual_review'
        ]
    },

    violationKeywords: [String], // Keywords that triggered flag

    reviewedByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    adminNotes: String,

    adminAction: {
        type: String,
        enum: ['approved', 'rejected', 'cancelled_feedback', 'warned_seller']
    },

    adminActionAt: Date,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    expiresAt: {
        type: Date,
        default: function () {
            return new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
        },
        index: true
    },

    // Metadata
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

// Compound indexes
feedbackRevisionRequestSchema.index({ review: 1 }, { unique: true }); // Only 1 request per review
feedbackRevisionRequestSchema.index({ seller: 1, createdAt: -1 });
feedbackRevisionRequestSchema.index({ buyer: 1, status: 1 });
feedbackRevisionRequestSchema.index({ flaggedForReview: 1, status: 1 });
feedbackRevisionRequestSchema.index({ expiresAt: 1 }); // For cleanup

// Virtual for checking if expired
feedbackRevisionRequestSchema.virtual('isExpired').get(function () {
    return this.expiresAt < new Date() && this.status === 'pending';
});

// Static method to check if seller can request revision
feedbackRevisionRequestSchema.statics.canSellerRequest = async function (sellerId, reviewId) {
    // Check if already requested for this review
    const existing = await this.findOne({ review: reviewId });
    if (existing) {
        return { allowed: false, reason: 'Already requested revision for this review' };
    }

    // Check seller's request count in last 365 days
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const requestCount = await this.countDocuments({
        seller: sellerId,
        createdAt: { $gte: oneYearAgo }
    });

    if (requestCount >= 5) {
        return { allowed: false, reason: 'Maximum 5 revision requests per year reached' };
    }

    return { allowed: true };
};

// Static method to get seller's request count
feedbackRevisionRequestSchema.statics.getSellerRequestCount = async function (sellerId, days = 365) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await this.countDocuments({
        seller: sellerId,
        createdAt: { $gte: since }
    });
};

// Method to mark as expired
feedbackRevisionRequestSchema.methods.markExpired = async function () {
    if (this.status === 'pending' && this.expiresAt < new Date()) {
        this.status = 'expired';
        await this.save();
        return true;
    }
    return false;
};

module.exports = mongoose.model('FeedbackRevisionRequest', feedbackRevisionRequestSchema);
