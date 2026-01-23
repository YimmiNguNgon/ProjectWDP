const Message = require('../models/Message');
const MessageDebugLog = require('../models/MessageDebugLog');
const Conversation = require('../models/Conversation');

/**
 * Chat History Service
 * Optimized for large-scale message storage and retrieval
 */
class ChatHistoryService {

    /**
     * Get paginated chat history
     * @param {string} conversationId - Conversation ID
     * @param {Object} options - { limit, before, after, userId }
     * @returns {Object} - { messages, hasMore, cursor }
     */
    async getChatHistory(conversationId, options = {}) {
        const {
            limit = 50,
            before = null,  // Cursor-based pagination (message ID or timestamp)
            after = null,
            userId = null
        } = options;

        try {
            const startTime = Date.now();

            // Build query
            const query = { conversation: conversationId };

            // Cursor-based pagination
            if (before) {
                query.createdAt = { $lt: new Date(before) };
            } else if (after) {
                query.createdAt = { $gt: new Date(after) };
            }

            // Fetch messages with pagination
            const messages = await Message.find(query)
                .sort({ createdAt: -1 }) // Most recent first
                .limit(limit + 1) // Fetch one extra to check if there's more
                .populate('sender', 'username role')
                .populate('productRef', 'title price imageUrl')
                .lean();

            // Check if there are more messages
            const hasMore = messages.length > limit;
            if (hasMore) {
                messages.pop(); // Remove the extra message
            }

            // Get cursor for next page
            const cursor = messages.length > 0
                ? messages[messages.length - 1].createdAt.toISOString()
                : null;

            const processingTime = Date.now() - startTime;

            // Log the query for debugging
            await MessageDebugLog.logEvent({
                messageId: null,
                conversationId,
                eventType: 'message_created',
                eventData: {
                    action: 'fetch_history',
                    limit,
                    before,
                    after,
                    resultCount: messages.length
                },
                userId,
                processingTime
            });

            return {
                messages,
                hasMore,
                cursor,
                count: messages.length,
                processingTime
            };
        } catch (err) {
            console.error('getChatHistory error:', err);
            throw err;
        }
    }

    /**
     * Get chat history with search
     * @param {string} conversationId - Conversation ID
     * @param {string} searchQuery - Search text
     * @param {Object} options - { limit, skip }
     */
    async searchChatHistory(conversationId, searchQuery, options = {}) {
        const { limit = 50, skip = 0 } = options;

        try {
            const startTime = Date.now();

            const messages = await Message.find({
                conversation: conversationId,
                text: { $regex: searchQuery, $options: 'i' }
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .populate('sender', 'username role')
                .lean();

            const total = await Message.countDocuments({
                conversation: conversationId,
                text: { $regex: searchQuery, $options: 'i' }
            });

            const processingTime = Date.now() - startTime;

            return {
                messages,
                total,
                limit,
                skip,
                hasMore: skip + messages.length < total,
                processingTime
            };
        } catch (err) {
            console.error('searchChatHistory error:', err);
            throw err;
        }
    }

    /**
     * Get message statistics for a conversation
     */
    async getConversationStats(conversationId) {
        try {
            const stats = await Message.aggregate([
                { $match: { conversation: conversationId } },
                {
                    $group: {
                        _id: null,
                        totalMessages: { $sum: 1 },
                        totalAutoReplies: {
                            $sum: { $cond: ['$isAutoReply', 1, 0] }
                        },
                        totalFlagged: {
                            $sum: { $cond: [{ $eq: ['$moderationStatus', 'flagged'] }, 1, 0] }
                        },
                        totalBlocked: {
                            $sum: { $cond: [{ $eq: ['$moderationStatus', 'blocked'] }, 1, 0] }
                        },
                        firstMessage: { $min: '$createdAt' },
                        lastMessage: { $max: '$createdAt' }
                    }
                }
            ]);

            return stats[0] || {
                totalMessages: 0,
                totalAutoReplies: 0,
                totalFlagged: 0,
                totalBlocked: 0,
                firstMessage: null,
                lastMessage: null
            };
        } catch (err) {
            console.error('getConversationStats error:', err);
            throw err;
        }
    }

    /**
     * Archive old messages (soft delete)
     * @param {number} daysOld - Archive messages older than X days
     */
    async archiveOldMessages(daysOld = 365) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

            const result = await Message.updateMany(
                {
                    createdAt: { $lt: cutoffDate },
                    archived: { $ne: true }
                },
                {
                    $set: { archived: true, archivedAt: new Date() }
                }
            );

            console.log(`Archived ${result.modifiedCount} messages older than ${daysOld} days`);
            return result;
        } catch (err) {
            console.error('archiveOldMessages error:', err);
            throw err;
        }
    }

    /**
     * Get user's message activity
     */
    async getUserMessageActivity(userId, options = {}) {
        const { days = 30 } = options;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        try {
            const activity = await Message.aggregate([
                {
                    $match: {
                        sender: userId,
                        createdAt: { $gte: since }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return activity;
        } catch (err) {
            console.error('getUserMessageActivity error:', err);
            throw err;
        }
    }

    /**
     * Export conversation history
     */
    async exportConversationHistory(conversationId, format = 'json') {
        try {
            const messages = await Message.find({ conversation: conversationId })
                .sort({ createdAt: 1 })
                .populate('sender', 'username')
                .lean();

            const conversation = await Conversation.findById(conversationId)
                .populate('participants', 'username')
                .lean();

            const exportData = {
                conversation: {
                    id: conversation._id,
                    participants: conversation.participants.map(p => p.username),
                    createdAt: conversation.createdAt,
                    messageCount: messages.length
                },
                messages: messages.map(m => ({
                    id: m._id,
                    sender: m.sender.username,
                    text: m.text,
                    timestamp: m.createdAt,
                    isAutoReply: m.isAutoReply,
                    moderationStatus: m.moderationStatus
                }))
            };

            if (format === 'csv') {
                // Convert to CSV format
                const csv = this._convertToCSV(exportData.messages);
                return { format: 'csv', data: csv };
            }

            return { format: 'json', data: exportData };
        } catch (err) {
            console.error('exportConversationHistory error:', err);
            throw err;
        }
    }

    _convertToCSV(messages) {
        const headers = ['ID', 'Sender', 'Text', 'Timestamp', 'Is Auto Reply', 'Status'];
        const rows = messages.map(m => [
            m.id,
            m.sender,
            `"${m.text.replace(/"/g, '""')}"`,
            m.timestamp,
            m.isAutoReply,
            m.moderationStatus
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

module.exports = new ChatHistoryService();
