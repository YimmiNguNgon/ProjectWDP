const mongoose = require("mongoose");

const convSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now },
  meta: { type: Object, default: {} }, // extensible
  // Moderation fields
  flagged: { type: Boolean, default: false },
  flaggedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  flagReason: { type: String },
  flaggedAt: { type: Date },
});

convSchema.index({ participants: 1, lastMessageAt: -1 });
convSchema.index({ flagged: 1, flaggedAt: -1 });

module.exports = mongoose.model("Conversation", convSchema);
