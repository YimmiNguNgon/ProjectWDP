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
      // required: true, // Tạm thời tắt để fix lỗi data cũ không có email
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: String,
    reputationScore: { type: Number, default: 0 }, // computed

    // Profile information
    phone: { type: String },
    avatar: { type: String }, // URL to avatar image
    bio: { type: String, maxlength: 500 },

    // Shipping addresses
    addresses: [
      {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        district: { type: String },
        ward: { type: String },
        state: { type: String, required: true },
        country: { type: String, required: true, default: "Vietnam" },
        isDefault: { type: Boolean, default: false },
      },
    ],

    // Account type (basic or premium)
    accountType: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
    },
    premiumExpiresAt: { type: Date }, // When premium expires
    premiumActivatedAt: { type: Date }, // When premium was activated

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
