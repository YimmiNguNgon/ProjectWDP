const mongoose = require("mongoose");

const voucherRequestSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    voucher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
  },
  { timestamps: true },
);

voucherRequestSchema.index({ seller: 1, status: 1, createdAt: -1 });
voucherRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("VoucherRequest", voucherRequestSchema);
