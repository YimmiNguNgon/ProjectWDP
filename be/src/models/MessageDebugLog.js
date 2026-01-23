const mongoose = require('mongoose');

/**
 * Message Debug Log Schema
 * Tracks every message event for debugging and audit purposes
 */
const messageDebugLogSchema = new mongoose.Schema({
    // Message reference
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: true,
        index: true
    },

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },

    // Event details
    eventType: {
        type: String,
        required: true,
        enum: [
            'message_created',
            'message_sent',
            'message_delivered',
            'message_read',
            'message_edited',
            'message_deleted',
            'message_blocked',
            'message_flagged',
            'auto_reply_sent',
            'moderation_check',
            'enforcement_action'
        ],
        index: true
    },

    // Event metadata
    eventData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // User who triggered the event
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Message content snapshot (for audit)
    messageSnapshot: {
        text: String,
        sender: mongoose.Schema.Types.ObjectId,
        attachments: Array,
        moderationStatus: String,
        moderationFlags: [String]
    },

    // Performance tracking
    processingTime: {
        type: Number, // milliseconds
        default: 0
    },

    // Error tracking
    error: {
        occurred: { type: Boolean, default: false },
        message: String,
        stack: String
    },

    // IP and device info (optional)
    ipAddress: String,
    userAgent: String,

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // Using custom timestamp field
});

// Compound indexes for common queries
messageDebugLogSchema.index({ messageId: 1, timestamp: -1 });
messageDebugLogSchema.index({ conversationId: 1, timestamp: -1 });
messageDebugLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
messageDebugLogSchema.index({ eventType: 1, timestamp: -1 });
messageDebugLogSchema.index({ timestamp: -1 }); // For time-based queries

// TTL index - auto-delete logs older than 90 days
messageDebugLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log an event
messageDebugLogSchema.statics.logEvent = async function (params) {
    const {
        messageId,
        conversationId,
        eventType,
        eventData = {},
        userId,
        messageSnapshot,
        processingTime = 0,
        error = null,
        ipAddress,
        userAgent
    } = params;

    try {
        await this.create({
            messageId,
            conversationId,
            eventType,
            eventData,
            userId,
            messageSnapshot,
            processingTime,
            error: error ? {
                occurred: true,
                message: error.message,
                stack: error.stack
            } : { occurred: false },
            ipAddress,
            userAgent,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Failed to log message event:', err);
        // Don't throw - logging failure shouldn't break the main flow
    }
};

// Static method to get message timeline
messageDebugLogSchema.statics.getMessageTimeline = async function (messageId) {
    return await this.find({ messageId })
        .sort({ timestamp: 1 })
        .populate('userId', 'username')
        .lean();
};

// Static method to get conversation debug logs
messageDebugLogSchema.statics.getConversationLogs = async function (conversationId, options = {}) {
    const { limit = 100, skip = 0, eventType } = options;

    const query = { conversationId };
    if (eventType) query.eventType = eventType;

    return await this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'username')
        .populate('messageId')
        .lean();
};

module.exports = mongoose.model('MessageDebugLog', messageDebugLogSchema);
