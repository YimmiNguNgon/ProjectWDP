const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: String,
    avatarUrl: { type: String, default: "" },
    reputationScore: { type: Number, default: 0 }, // computed

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    lastVerificationEmailSentAt: { type: Date },

    // Password reset
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // User status and ban tracking
    status: {
      type: String,
      enum: ["active", "banned", "suspended", "restricted"],
      default: "active",
      index: true,
    },
    bannedAt: { type: Date },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    banReason: { type: String },
    suspendedUntil: { type: Date }, // Temporary suspension

    // Messaging restrictions (eBay-style)
    messagingRestricted: { type: Boolean, default: false },
    messagingRestrictedUntil: { type: Date },
    messagingRestrictedReason: { type: String },

    // Violation tracking
    violationCount: { type: Number, default: 0 },
    lastViolationAt: { type: Date },
    warningCount: { type: Number, default: 0 },
    lastWarningAt: { type: Date },

    // OAuth provider
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: { type: String, sparse: true, unique: true },

    // User preferences for purchases
    savedSellers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    hiddenOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    // ─── Seller stage system ───────────────────────────────────────────────
    // Chỉ có giá trị khi role === "seller"
    sellerStage: {
      type: String,
      enum: ["PROBATION", "NORMAL"],
      default: null,
      index: true,
    },
    sellerInfo: {
      shopName: { type: String, default: "" },
      productDescription: { type: String, default: "" },
      registeredAt: { type: Date },         // Ngày trở thành seller
      lastStageChangedAt: { type: Date },   // Lần nâng/hạ cấp gần nhất
      // Cached metrics – cập nhật bởi cron job hàng ngày
      successOrders: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
      refundRate: { type: Number, default: 0 }, // 0-100 (%)
      reportRate: { type: Number, default: 0 }, // 0-100 (%)
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
