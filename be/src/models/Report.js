const mongoose = require("mongoose");

/**
 * Report – Buyer report against a seller/product/order.
 * Reports go through admin or automated moderation before affecting seller metrics.
 *
 * Status flow:
 *   PENDING → VALID   (affects seller TrustScore)
 *   PENDING → REJECTED (no effect; used to track buyer accuracy)
 */
const reportSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    reason: {
      type: String,
      enum: [
        "FAKE_PRODUCT",
        "WRONG_DESCRIPTION",
        "SCAM_OR_FRAUD",
        "POOR_QUALITY",
        "SPAM_OR_PROHIBITED",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    evidenceUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "VALID", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    // Admin who reviewed this report
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    // Optional admin note on verification decision
    adminNote: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index({ seller: 1, status: 1, createdAt: -1 });
reportSchema.index({ buyer: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
