const mongoose = require("mongoose");

const banAppealSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    banReasonSnapshot: { type: String, default: "" },
    appealReason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true },
);

banAppealSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

module.exports = mongoose.model("BanAppeal", banAppealSchema);
