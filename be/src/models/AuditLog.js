const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    actorRole: {
      type: String,
      default: "",
      index: true,
    },
    actorUsername: {
      type: String,
      default: "",
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: "",
      index: true,
    },
    method: {
      type: String,
      default: "",
      index: true,
    },
    path: {
      type: String,
      default: "",
      index: true,
    },
    statusCode: {
      type: Number,
      default: 0,
      index: true,
    },
    ip: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    requestBodyRaw: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    changedFields: [
      {
        field: { type: String, required: true },
        before: { type: mongoose.Schema.Types.Mixed, default: null },
        after: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
    errorMessage: {
      type: String,
      default: "",
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false },
);

auditLogSchema.index({ createdAt: -1, actorRole: 1, action: 1, resourceType: 1 });
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
