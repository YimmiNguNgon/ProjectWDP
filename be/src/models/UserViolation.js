const mongoose = require('mongoose');

/**
 * User Violation Schema
 * Tracks policy violations for users (similar to eBay's violation system)
 */
const userViolationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Violation details
    violationType: {
        type: String,
        required: true,
        enum: [
            'phone_number',
            'email_address',
            'social_media_link',
            'social_media_mention',
            'external_payment',
            'external_transaction',
            'external_link',
            'spam',
            'harassment',
            'fraud',
            'other'
        ]
    },

    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Context
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    },

    message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    violationText: String, // The actual violating content
    detectedAt: { type: Date, default: Date.now },

    // Action taken
    actionTaken: {
        type: String,
        enum: ['warning', 'restriction', 'suspension', 'ban', 'none'],
        default: 'none'
    },

    actionReason: String,
    actionTakenAt: Date,
    actionTakenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Automatic or manual
    isAutomatic: {
        type: Boolean,
        default: true
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'dismissed', 'actioned'],
        default: 'pending'
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    reviewedAt: Date,
    reviewNotes: String,

    // Appeal
    appealed: {
        type: Boolean,
        default: false
    },

    appealReason: String,
    appealedAt: Date,
    appealStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
    },

    appealReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    appealReviewedAt: Date
}, {
    timestamps: true
});

// Indexes for efficient queries
userViolationSchema.index({ user: 1, detectedAt: -1 });
userViolationSchema.index({ status: 1, detectedAt: -1 });
userViolationSchema.index({ violationType: 1, severity: 1 });
userViolationSchema.index({ actionTaken: 1 });

// Static method to get user's violation count
userViolationSchema.statics.getUserViolationCount = async function (userId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await this.countDocuments({
        user: userId,
        detectedAt: { $gte: since },
        status: { $ne: 'dismissed' }
    });
};

// Static method to get user's violation history
userViolationSchema.statics.getUserViolationHistory = async function (userId) {
    return await this.find({ user: userId })
        .sort({ detectedAt: -1 })
        .limit(50)
        .lean();
};

module.exports = mongoose.model('UserViolation', userViolationSchema);
