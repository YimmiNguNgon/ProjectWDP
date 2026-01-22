const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const conversationModerationService = require('../services/conversationModerationService');

// ==================== ADMIN ROUTES ====================

/**
 * Scan a single conversation for violations
 * POST /api/v1/moderation/scan/:conversationId
 */
router.post('/scan/:conversationId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { conversationId } = req.params;

        const result = await conversationModerationService.scanConversation(conversationId);

        return res.json({
            message: result.hasViolations
                ? 'Violations detected and conversation flagged'
                : 'No violations found',
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Scan all conversations for violations
 * POST /api/v1/moderation/scan-all
 */
router.post('/scan-all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { limit = 100, skipFlagged = true } = req.body;

        const result = await conversationModerationService.scanAllConversations({
            limit: parseInt(limit),
            skipFlagged
        });

        return res.json({
            message: `Scanned ${result.scanned} conversations, flagged ${result.flagged}`,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Scan recent conversations (last 24 hours)
 * POST /api/v1/moderation/scan-recent
 */
router.post('/scan-recent', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const result = await conversationModerationService.scanRecentConversations();

        return res.json({
            message: `Scanned ${result.scanned} recent conversations, flagged ${result.flagged}`,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get moderation statistics
 * GET /api/v1/moderation/statistics
 */
router.get('/statistics', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const stats = await conversationModerationService.getStatistics();

        return res.json({ data: stats });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Flag a conversation manually
 * POST /api/v1/moderation/flag/:conversationId
 */
router.post('/flag/:conversationId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { conversationId } = req.params;
        const { reason } = req.body;

        await conversationModerationService.flagConversation(
            conversationId,
            ['manual_review'],
            reason || 'Manually flagged by admin'
        );

        return res.json({ message: 'Conversation flagged successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
