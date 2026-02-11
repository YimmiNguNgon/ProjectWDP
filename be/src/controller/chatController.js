// src/controllers/chatController.js
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
// const { decryptText, encryptText } = require('../utils/encrypt'); // Optional encryption - commented out

const formatMsgs = (msgs) =>
  msgs.map((m) => ({
    id: m._id,
    conversationId: m.conversation,
    sender: m.sender,
    text: m.text,
    attachments: m.attachments || [],
    productRef: m.productRef || null,
    readBy: m.readBy || [],
    createdAt: m.createdAt,
  }));

exports.listConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const convs = await Conversation.find({ participants: userId })
      .populate('participants', 'username')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ data: convs });
  } catch (err) {
    next(err);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const id = req.params.id; // expect :id
    if (!id || !mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'Invalid conversation id' });

    const conv = await Conversation.findById(id).populate(
      'participants',
      'username'
    );
    if (!conv) return res.status(404).json({ message: 'Not found' });

    return res.json({ data: conv });
  } catch (err) {
    next(err);
  }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'Invalid conversation id' });

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    // Check if user is participant
    const userId = req.user._id.toString();
    if (!conv.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversation: id });

    // Delete conversation
    await Conversation.findByIdAndDelete(id);

    return res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const convId = req.params.id;
    if (!convId || !mongoose.isValidObjectId(convId))
      return res.status(400).json({ message: 'Invalid conversation id' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before; // ISO date string

    const query = { conversation: convId };
    if (before) {
      const dt = new Date(before);
      if (!isNaN(dt.getTime())) query.createdAt = { $lt: dt };
    }

    const msgs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('productRef')
      .lean();

    // decrypt server-side if decryptText exists and text looks encrypted
    const out = msgs.map((m) => {
      let text = m.text || '';
      try {
        if (typeof decryptText === 'function' && text) text = decryptText(text);
      } catch (e) {
        // if decrypt fails, keep raw value (don't crash)
      }
      return {
        id: m._id,
        conversationId: m.conversation,
        sender: m.sender,
        text,
        attachments: m.attachments || [],
        productRef: m.productRef || null,
        readBy: m.readBy || [],
        createdAt: m.createdAt,
      };
    });

    return res.json({ data: out });
  } catch (err) {
    next(err);
  }
};

exports.createConversation = async (req, res, next) => {
  try {
    let { participants } = req.body;
    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length < 2
    ) {
      return res
        .status(400)
        .json({ message: 'Participants required (2 users).' });
    }

    // Normalize participants: convert to ObjectId strings and sort
    participants = participants
      .map((p) => {
        // Handle both ObjectId and string formats
        const id = typeof p === 'object' && p._id ? p._id.toString() : p.toString();
        return id;
      })
      .sort();

    console.log('[Chat] Looking for conversation with participants:', participants);

    // Find existing conversation with these exact participants
    const existing = await Conversation.findOne({
      participants: { $all: participants, $size: participants.length },
    }).populate('participants', 'username');

    if (existing) {
      console.log('[Chat] Found existing conversation:', existing._id);
      return res
        .status(200)
        .json({ data: existing, message: 'Conversation already exists.' });
    }

    console.log('[Chat] Creating new conversation');
    const conv = await Conversation.create({ participants });

    // Populate before returning
    const populated = await Conversation.findById(conv._id).populate('participants', 'username');

    return res.status(201).json({ data: populated });
  } catch (err) {
    console.error('[Chat] Error in createConversation:', err);
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const convId = req.params.id;
    if (!convId || !mongoose.isValidObjectId(convId))
      return res.status(400).json({ message: 'Invalid conversation id' });

    await Message.updateMany(
      { conversation: convId },
      { $addToSet: { readBy: req.user._id } }
    );
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Archive conversation for current user
 */
exports.archiveConversation = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'Invalid conversation id' });

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const userId = req.user._id.toString();
    if (!conv.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Archive for this user
    if (!conv.meta) conv.meta = {};
    if (!conv.meta.archived) conv.meta.archived = [];
    if (!conv.meta.archived.includes(userId)) {
      conv.meta.archived.push(userId);
    }
    // Remove from inbox if present
    if (conv.meta.inbox) {
      conv.meta.inbox = conv.meta.inbox.filter(u => u !== userId);
    }
    conv.markModified('meta');
    await conv.save();

    return res.json({ message: 'Conversation archived successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Move conversation to inbox for current user
 */
exports.moveToInbox = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'Invalid conversation id' });

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const userId = req.user._id.toString();
    if (!conv.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Move to inbox for this user
    if (!conv.meta) conv.meta = {};
    if (!conv.meta.inbox) conv.meta.inbox = [];
    if (!conv.meta.inbox.includes(userId)) {
      conv.meta.inbox.push(userId);
    }
    // Remove from archived if present
    if (conv.meta.archived) {
      conv.meta.archived = conv.meta.archived.filter(u => u !== userId);
    }
    conv.markModified('meta');
    await conv.save();

    return res.json({ message: 'Conversation moved to inbox successfully' });
  } catch (err) {
    next(err);
  }
};

// ------------------ Flag Conversation ------------------
exports.flagConversation = async (req, res, next) => {
  try {
    const convId = req.params.id;
    const { reason } = req.body;

    if (!convId || !mongoose.isValidObjectId(convId))
      return res.status(400).json({ message: 'Invalid conversation id' });

    if (!reason || !reason.trim())
      return res.status(400).json({ message: 'Flag reason is required' });

    const conv = await Conversation.findById(convId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    // Check if user is participant
    if (!conv.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Already flagged by this user
    if (conv.flaggedBy && conv.flaggedBy.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You have already flagged this conversation' });
    }

    // Flag the conversation
    conv.flagged = true;
    if (!conv.flaggedBy) conv.flaggedBy = [];
    conv.flaggedBy.push(req.user._id);
    conv.flagReason = reason.trim();
    conv.flaggedAt = new Date();
    await conv.save();

    return res.json({ message: 'Conversation flagged successfully', data: conv });
  } catch (err) {
    next(err);
  }
};

// ------------------ Admin: Get Flagged Conversations ------------------
exports.adminGetFlaggedConversations = async (req, res, next) => {
  try {
    // Only admin can access
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const convs = await Conversation.find({ flagged: true })
      .populate('participants', 'username')
      .populate('flaggedBy', 'username')
      .sort({ flaggedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Conversation.countDocuments({ flagged: true });

    return res.json({ data: convs, page, limit, total });
  } catch (err) {
    next(err);
  }
};

// ------------------ Admin: Unflag Conversation ------------------
exports.adminUnflagConversation = async (req, res, next) => {
  try {
    // Only admin can unflag
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }

    const convId = req.params.id;
    if (!convId || !mongoose.isValidObjectId(convId))
      return res.status(400).json({ message: 'Invalid conversation id' });

    const conv = await Conversation.findById(convId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    // Unflag
    conv.flagged = false;
    conv.flaggedBy = [];
    conv.flagReason = null;
    conv.flaggedAt = null;
    await conv.save();

    return res.json({ message: 'Conversation unflagged successfully', data: conv });
  } catch (err) {
    next(err);
  }
};
