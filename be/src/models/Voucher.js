const mongoose = require("mongoose");

const voucherUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const voucherClaimSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    scope: {
      type: String,
      enum: ["global", "seller"],
      default: "seller",
      index: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdFromRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VoucherRequest",
      default: null,
    },
    source: {
      type: String,
      enum: ["admin_created", "seller_request", "gift_card_claim"],
      default: "seller_request",
    },
    isClaimable: {
      type: Boolean,
      default: false,
      index: true,
    },
    claimedBy: [voucherClaimSchema],
    usedBy: [voucherUsageSchema],
  },
  { timestamps: true },
);

voucherSchema.index({ code: 1, isActive: 1 });
voucherSchema.index({ scope: 1, isActive: 1, seller: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
