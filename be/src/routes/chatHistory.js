const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const chatHistoryService = require('../services/chatHistoryService');
const MessageDebugLog = require('../models/MessageDebugLog');

/**
 * Get paginated chat history
 * GET /api/v1/chat-history/:conversationId
 */
router.get('/:conversationId', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit, before, after } = req.query;

        const result = await chatHistoryService.getChatHistory(conversationId, {
            limit: parseInt(limit) || 50,
            before,
            after,
            userId: req.user._id
        });

        return res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Search chat history
 * GET /api/v1/chat-history/:conversationId/search
 */
router.get('/:conversationId/search', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { q, limit, skip } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const result = await chatHistoryService.searchChatHistory(conversationId, q, {
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0
        });

        return res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get conversation statistics
 * GET /api/v1/chat-history/:conversationId/stats
 */
router.get('/:conversationId/stats', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;

        const stats = await chatHistoryService.getConversationStats(conversationId);

        return res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Export conversation history
 * GET /api/v1/chat-history/:conversationId/export
 */
router.get('/:conversationId/export', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { format = 'json' } = req.query;

        const result = await chatHistoryService.exportConversationHistory(conversationId, format);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="conversation_${conversationId}.csv"`);
            return res.send(result.data);
        }

        return res.json({
            success: true,
            data: result.data
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get message debug timeline
 * GET /api/v1/chat-history/debug/message/:messageId
 */
router.get('/debug/message/:messageId', auth, async (req, res) => {
    try {
        const { messageId } = req.params;

        const timeline = await MessageDebugLog.getMessageTimeline(messageId);

        return res.json({
            success: true,
            data: timeline
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get conversation debug logs
 * GET /api/v1/chat-history/debug/conversation/:conversationId
 */
router.get('/debug/conversation/:conversationId', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit, skip, eventType } = req.query;

        const logs = await MessageDebugLog.getConversationLogs(conversationId, {
            limit: parseInt(limit) || 100,
            skip: parseInt(skip) || 0,
            eventType
        });

        return res.json({
            success: true,
            data: logs
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get user message activity
 * GET /api/v1/chat-history/activity/:userId
 */
router.get('/activity/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { days } = req.query;

        // Only allow users to see their own activity, or admins
        if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const activity = await chatHistoryService.getUserMessageActivity(userId, {
            days: parseInt(days) || 30
        });

        return res.json({
            success: true,
            data: activity
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * ADMIN: Archive old messages
 * POST /api/v1/chat-history/admin/archive
 */
router.post('/admin/archive', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { daysOld } = req.body;

        const result = await chatHistoryService.archiveOldMessages(parseInt(daysOld) || 365);

        return res.json({
            success: true,
            message: `Archived ${result.modifiedCount} messages`,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
