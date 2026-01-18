const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { validateMessageContent } = require('../utils/contentModerator');

/**
 * Conversation Moderation Service
 * Automatically scans conversations for policy violations
 */
class ConversationModerationService {
    /**
     * Scan a single conversation for violations
     * @param {string} conversationId - Conversation ID to scan
     * @returns {Object} - { hasViolations, violations, violatingMessages }
     */
    async scanConversation(conversationId) {
        try {
            const messages = await Message.find({ conversation: conversationId })
                .sort({ createdAt: 1 })
                .lean();

            const violations = [];
            const violatingMessages = [];

            for (const message of messages) {
                if (!message.text || message.isAutoReply) continue;

                const moderationResult = validateMessageContent(message.text);

                if (!moderationResult.isValid) {
                    violations.push(...moderationResult.violations);
                    violatingMessages.push({
                        messageId: message._id,
                        sender: message.sender,
                        text: message.text,
                        violations: moderationResult.violations,
                        reason: moderationResult.blockedReason,
                        createdAt: message.createdAt
                    });

                    // Update message moderation status
                    await Message.findByIdAndUpdate(message._id, {
                        moderationStatus: 'flagged',
                        moderationFlags: moderationResult.violations
                    });
                }
            }

            return {
                hasViolations: violations.length > 0,
                violations: [...new Set(violations)], // Remove duplicates
                violatingMessages,
                totalMessages: messages.length,
                violatingCount: violatingMessages.length
            };
        } catch (err) {
            console.error('scanConversation error:', err);
            throw err;
        }
    }

    /**
     * Scan all conversations for violations
     * @param {Object} options - { limit, skipFlagged }
     * @returns {Object} - { scanned, flagged, results }
     */
    async scanAllConversations(options = {}) {
        const { limit = 100, skipFlagged = true } = options;

        try {
            const query = skipFlagged ? { flagged: { $ne: true } } : {};

            const conversations = await Conversation.find(query)
                .sort({ lastMessageAt: -1 })
                .limit(limit)
                .lean();

            const results = [];
            let flaggedCount = 0;

            for (const conv of conversations) {
                const scanResult = await this.scanConversation(conv._id);

                if (scanResult.hasViolations) {
                    // Auto-flag the conversation
                    await this.flagConversation(
                        conv._id,
                        scanResult.violations,
                        'Automatic moderation scan'
                    );

                    flaggedCount++;
                    results.push({
                        conversationId: conv._id,
                        participants: conv.participants,
                        ...scanResult
                    });
                }
            }

            return {
                scanned: conversations.length,
                flagged: flaggedCount,
                results
            };
        } catch (err) {
            console.error('scanAllConversations error:', err);
            throw err;
        }
    }

    /**
     * Flag a conversation with violations
     * @param {string} conversationId - Conversation ID
     * @param {Array} violations - Array of violation types
     * @param {string} reason - Reason for flagging
     */
    async flagConversation(conversationId, violations, reason) {
        try {
            const flagReason = reason || `Violations detected: ${violations.join(', ')}`;

            await Conversation.findByIdAndUpdate(conversationId, {
                flagged: true,
                flagReason,
                flaggedAt: new Date()
            });

            console.log(`Conversation ${conversationId} flagged: ${flagReason}`);
        } catch (err) {
            console.error('flagConversation error:', err);
            throw err;
        }
    }

    /**
     * Get moderation statistics
     * @returns {Object} - Statistics about flagged conversations
     */
    async getStatistics() {
        try {
            const totalConversations = await Conversation.countDocuments();
            const flaggedConversations = await Conversation.countDocuments({ flagged: true });

            const flaggedMessages = await Message.countDocuments({
                moderationStatus: 'flagged'
            });

            // Get violation breakdown
            const violationBreakdown = await Message.aggregate([
                { $match: { moderationStatus: 'flagged' } },
                { $unwind: '$moderationFlags' },
                { $group: { _id: '$moderationFlags', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            return {
                totalConversations,
                flaggedConversations,
                flaggedMessages,
                flaggedPercentage: totalConversations > 0
                    ? ((flaggedConversations / totalConversations) * 100).toFixed(2)
                    : 0,
                violationBreakdown: violationBreakdown.map(v => ({
                    type: v._id,
                    count: v.count
                }))
            };
        } catch (err) {
            console.error('getStatistics error:', err);
            throw err;
        }
    }

    /**
     * Scan recent conversations (last 24 hours)
     * @returns {Object} - Scan results
     */
    async scanRecentConversations() {
        try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const conversations = await Conversation.find({
                lastMessageAt: { $gte: yesterday },
                flagged: { $ne: true }
            }).lean();

            const results = [];
            let flaggedCount = 0;

            for (const conv of conversations) {
                const scanResult = await this.scanConversation(conv._id);

                if (scanResult.hasViolations) {
                    await this.flagConversation(
                        conv._id,
                        scanResult.violations,
                        'Automatic daily scan'
                    );

                    flaggedCount++;
                    results.push({
                        conversationId: conv._id,
                        ...scanResult
                    });
                }
            }

            return {
                scanned: conversations.length,
                flagged: flaggedCount,
                results
            };
        } catch (err) {
            console.error('scanRecentConversations error:', err);
            throw err;
        }
    }
}

module.exports = new ConversationModerationService();
