// src/socket/index.js
const mongoose = require('mongoose');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
// const { encryptText, decryptText } = require('./utils/encrypt'); // optional - commented out

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // client may send auth info to associate userId with socket (simple demo)
    socket.on('auth', (payload) => {
      // payload: { userId }
      if (payload && payload.userId) {
        socket.data.userId = payload.userId;
        // Join personal room de nhan notification realtime
        socket.join(`user_${payload.userId}`);
      }
    });

    // join a conversation room
    socket.on('join_room', async ({ conversationId, userId }, ack) => {
      try {
        if (!conversationId || !mongoose.isValidObjectId(conversationId)) {
          if (typeof ack === 'function')
            return ack({ ok: false, error: 'invalid_conversation_id' });
          return;
        }
        socket.join(conversationId);
        if (userId) socket.data.userId = userId;
        console.log(
          `${socket.data.userId || 'unknown'} joined ${conversationId}`
        );
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        console.error('join_room err', err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    // send a message
    socket.on('send_message', async (payload, ack) => {
      // payload: { conversationId, sender, text, attachments, productRef }
      try {
        const { conversationId, sender, text, attachments, productRef } =
          payload || {};
        console.log('[send_message] received:', { conversationId, sender, textLen: text?.length });
        if (!conversationId || !mongoose.isValidObjectId(conversationId)) {
          console.log('[send_message] invalid conversationId:', conversationId);
          if (typeof ack === 'function')
            return ack({ ok: false, error: 'invalid_conversation_id' });
          return;
        }
        if (!sender || !mongoose.isValidObjectId(sender)) {
          console.log('[send_message] invalid sender:', sender);
          if (typeof ack === 'function')
            return ack({ ok: false, error: 'invalid_sender' });
          return;
        }

        // ========== USER ENFORCEMENT CHECK ==========
        const userEnforcementService = require('./services/userEnforcementService');

        // Check if user is allowed to send messages
        const permissionCheck = await userEnforcementService.canSendMessage(sender);
        if (!permissionCheck.allowed) {
          console.log(`Message blocked - user restricted: ${sender}`);

          socket.emit('message_blocked', {
            violations: ['user_restricted'],
            reason: permissionCheck.reason,
          });

          if (typeof ack === 'function') {
            return ack({
              ok: false,
              error: 'user_restricted',
              reason: permissionCheck.reason,
            });
          }
          return;
        }
        // ========== END USER ENFORCEMENT CHECK ==========

        // ========== CONTENT MODERATION ==========
        const { validateMessageContent } = require('./utils/contentModerator');
        const moderationResult = validateMessageContent(text);

        if (!moderationResult.isValid) {
          console.log(`Message blocked for user ${sender}:`, moderationResult.violations);

          // 🆕 Record violation and take enforcement action (eBay-style)
          try {
            const enforcement = await userEnforcementService.recordViolation({
              userId: sender,
              violationType: moderationResult.violations[0], // Primary violation
              conversation: conversationId,
              message: null, // Message not created yet
              violationText: text
            });

            console.log(`Enforcement action taken: ${enforcement.action.type}`);

            // 🆕 Auto-flag conversation for admin review
            const Conversation = require('./models/Conversation');
            await Conversation.findByIdAndUpdate(conversationId, {
              flagged: true,
              flagReason: `Violation detected: ${moderationResult.violations.join(', ')}`,
              flaggedAt: new Date()
            });

            console.log(`Conversation ${conversationId} flagged for admin review`);

            // Emit enforcement notification to user
            socket.emit('enforcement_action', {
              action: enforcement.action.type,
              message: enforcement.action.message,
              violationCount: enforcement.user.violationCount
            });
          } catch (enforcementErr) {
            console.error('Enforcement error:', enforcementErr);
          }

          // Emit blocked event to sender
          socket.emit('message_blocked', {
            violations: moderationResult.violations,
            reason: moderationResult.blockedReason,
          });

          // Return error via acknowledgment
          if (typeof ack === 'function') {
            return ack({
              ok: false,
              error: 'content_violation',
              violations: moderationResult.violations,
              reason: moderationResult.blockedReason,
            });
          }
          return;
        }
        // ========== END CONTENT MODERATION ==========

        // encrypt text if helper exists
        let storedText = text || '';
        try {
          if (typeof encryptText === 'function' && storedText) {
            storedText = encryptText(storedText);
          }
        } catch (e) {
          // encryption failed — fallback to raw text but log
          console.warn('encryptText failed, storing raw text', e.message);
        }

        const msgDoc = {
          conversation: conversationId,
          sender,
          text: storedText,
          attachments: Array.isArray(attachments)
            ? attachments
            : attachments
              ? [attachments]
              : [],
          productRef:
            productRef && mongoose.isValidObjectId(productRef)
              ? productRef
              : null,
          // readBy empty initially
        };

        const messageCreateStart = Date.now();
        const newMsgDoc = await Message.create(msgDoc);
        const messageCreateTime = Date.now() - messageCreateStart;

        // 🆕 Debug logging - Track message creation
        const MessageDebugLog = require('./models/MessageDebugLog');
        await MessageDebugLog.logEvent({
          messageId: newMsgDoc._id,
          conversationId,
          eventType: 'message_created',
          eventData: {
            hasAttachments: msgDoc.attachments.length > 0,
            hasProductRef: !!msgDoc.productRef,
            textLength: text?.length || 0
          },
          userId: sender,
          messageSnapshot: {
            text: text,
            sender: sender,
            attachments: msgDoc.attachments,
            moderationStatus: 'approved'
          },
          processingTime: messageCreateTime
        });

        // update conversation metadata: lastMessageAt and optionally lastMessage ref (if you track it)
        try {
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageAt: newMsgDoc.createdAt || new Date(),
            lastMessage: newMsgDoc._id,
          }).catch(() => { }); // ignore update errors
        } catch (e) {
          // noop
        }

        // Populate productRef to send complete product data
        await newMsgDoc.populate('productRef');

        // Prepare payload to emit to room. Send plain text since encryption is disabled
        // and include _id + createdAt so clients can sort/ack.
        const emitPayload = {
          id: newMsgDoc._id,
          conversationId: newMsgDoc.conversation,
          sender: newMsgDoc.sender,
          text: text, // Send original plain text, not encrypted storedText
          attachments: newMsgDoc.attachments,
          productRef: newMsgDoc.productRef,
          readBy: newMsgDoc.readBy || [],
          createdAt: newMsgDoc.createdAt,
        };

        io.to(conversationId).emit('new_message', emitPayload);

        // Gửi notification tới participants khác (không phải người gửi)
        try {
          const notificationService = require('./services/notificationService');
          const convData = await Conversation.findById(conversationId).populate('participants', '_id username');
          if (convData) {
            const otherParticipants = convData.participants.filter(
              p => p._id.toString() !== sender.toString()
            );
            const senderUser = convData.participants.find(p => p._id.toString() === sender.toString());
            const senderName = senderUser ? senderUser.username : 'Nguoi dung';
            for (const participant of otherParticipants) {
              await notificationService.sendNotification({
                recipientId: participant._id,
                type: 'new_message',
                title: 'Tin nhan moi',
                body: `${senderName}: ${text ? text.substring(0, 60) + (text.length > 60 ? '...' : '') : '[Dinh kem]'}`,
                link: '/my-ebay/messages',
                metadata: { conversationId, senderId: sender },
              });
            }
          }
        } catch (notifErr) {
          console.error('Notification send error:', notifErr.message);
        }

        // 🆕 Auto-reply logic
        try {
          const autoReplyService = require('./services/autoReplyService');

          // Get conversation with participants
          const conv = await Conversation.findById(conversationId)
            .populate('participants', 'role');

          if (conv) {
            // Check if sender is buyer
            const senderUser = conv.participants.find(
              p => p._id.toString() === sender.toString()
            );

            if (senderUser && senderUser.role === 'buyer') {
              // Find seller
              const sellerUser = conv.participants.find(p => p.role === 'seller');

              if (sellerUser) {
                // Check for first message trigger
                const buyerMessageCount = await Message.countDocuments({
                  conversation: conversationId,
                  sender: sender
                });

                if (buyerMessageCount === 1) {
                  // First message from buyer
                  const template = await autoReplyService.shouldSendAutoReply(
                    conv,
                    'first_message',
                    sellerUser._id
                  );

                  if (template) {
                    await autoReplyService.sendAutoReply(
                      conv,
                      template,
                      sender,
                      io
                    );
                  }
                }

                // Check for keyword triggers
                const keywordTrigger = autoReplyService.detectTrigger(text);
                if (keywordTrigger) {
                  const template = await autoReplyService.shouldSendAutoReply(
                    conv,
                    keywordTrigger,
                    sellerUser._id
                  );

                  if (template) {
                    await autoReplyService.sendAutoReply(
                      conv,
                      template,
                      sender,
                      io
                    );
                  }
                }
              }
            }
          }
        } catch (autoReplyErr) {
          console.error('Auto-reply error:', autoReplyErr);
          // Don't fail the main message send
        }

        if (typeof ack === 'function') ack({ ok: true, data: emitPayload });
      } catch (err) {
        console.error('send_message err', err);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
        socket.emit('error', {
          type: 'send_message_failed',
          message: err.message,
        });
      }
    });

    // typing indicator
    socket.on('typing', ({ conversationId, userId }) => {
      try {
        if (!conversationId) return;
        socket
          .to(conversationId)
          .emit('user_typing', { conversationId, userId });
      } catch (err) {
        console.error('typing err', err);
      }
    });

    // mark a single message read by _id or mark up-to timestamp
    socket.on(
      'message_read',
      async ({ conversationId, messageId, userId }, ack) => {
        try {
          if (!messageId || !mongoose.isValidObjectId(messageId)) {
            if (typeof ack === 'function')
              return ack({ ok: false, error: 'invalid_message_id' });
            return;
          }
          const userObj = userId || socket.data.userId;
          if (!userObj) {
            if (typeof ack === 'function')
              return ack({ ok: false, error: 'missing_user' });
          }

          const msg = await Message.findByIdAndUpdate(
            messageId,
            { $addToSet: { readBy: userObj } },
            { new: true }
          ).lean();

          if (!msg) {
            if (typeof ack === 'function')
              return ack({ ok: false, error: 'message_not_found' });
            return;
          }

          io.to(conversationId).emit('update_read_status', {
            messageId: msg._id,
            readBy: msg.readBy,
          });

          if (typeof ack === 'function')
            ack({ ok: true, data: { messageId: msg._id, readBy: msg.readBy } });
        } catch (err) {
          console.error('message_read err', err);
          if (typeof ack === 'function') ack({ ok: false, error: err.message });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });
}

module.exports = initSocket;
