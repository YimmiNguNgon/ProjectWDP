// src/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: [
      {
        url: { type: String },
        type: {
          type: String,
          enum: ["image", "video", "file", "other"],
          default: "other",
        },
      },
    ],
    productRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deliveredAt: { type: Date },
    seenAt: { type: Date },
    // Moderation fields (optional, for tracking)
    moderationFlags: {
      type: [String],
      default: [],
      enum: [
        "phone_number",
        "social_media_link",
        "social_media_mention",
        "email_address",
        "external_payment",
        "external_transaction",
        "external_link",
      ],
    },
    moderationStatus: {
      type: String,
      enum: ["approved", "flagged", "blocked"],
      default: "approved",
    },

    // Auto-reply fields
    isAutoReply: {
      type: Boolean,
      default: false,
    },
    autoReplyTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutoReplyTemplate",
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
