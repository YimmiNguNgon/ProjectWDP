const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    reviewer: {
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    rating1: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    rating2: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    rating3: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    type: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      index: true,
    },

    // Review moderation fields
    flagged: { type: Boolean, default: false, index: true },
    flaggedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    flagReason: { type: String },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Revision tracking
    revisionRequested: { type: Boolean, default: false },
    revisionRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackRevisionRequest"
    },
    originalRating: Number,
    originalComment: String,
    revisedAt: Date,
    revisionHistory: [{
      rating: Number,
      comment: String,
      revisedAt: { type: Date, default: Date.now }
    }],

    // Seller response to feedback (eBay-style)
    sellerResponse: {
      type: String,
      maxlength: 500,
      trim: true
    },
    sellerResponseAt: Date,
    sellerResponseEdited: { type: Boolean, default: false },
    sellerResponseEditedAt: Date,

    // Seller response moderation
    sellerResponseFlagged: { type: Boolean, default: false },
    sellerResponseFlagReason: String
  },
  { timestamps: true }
);

// unique constraint
reviewSchema.index({ order: 1, reviewer: 1, product: 1 }, { unique: true });

// rating index
reviewSchema.index({ product: 1, rating: 1 });

module.exports = mongoose.model("Review", reviewSchema);
