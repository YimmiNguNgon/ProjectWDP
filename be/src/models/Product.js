const mongoose = require("mongoose");
require("../models/Category.js");

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    image: { type: String }, // Main image from database
    images: [{ type: String }], // Additional images array
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    quantity: { type: Number, default: 0 }, // Stock/inventory
    condition: { type: String, default: "" },
    status: { type: String, default: "available" },

    watchCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Listing management
    listingStatus: {
      type: String,
      enum: ["active", "paused", "ended", "deleted"],
      default: "active",
      index: true,
    },
    deletedAt: { type: Date, default: null }, // Soft delete

    // Inventory management
    lowStockThreshold: { type: Number, default: 5 },

    // Variants (size, color, etc.)
    variants: [
      {
        name: { type: String, required: true }, // e.g., "Size", "Color"
        options: [
          {
            value: { type: String, required: true }, // e.g., "M", "Red"
            price: { type: Number }, // Optional price override
            quantity: { type: Number, default: 0 },
            sku: { type: String }, // Stock keeping unit
          },
        ],
      },
    ],

    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isAuction: { type: Boolean, default: false },
    auctionEndTime: { type: Date, default: null },

    // Promotion system (Brand Outlet / Daily Deals)
    promotionType: {
      type: String,
      enum: ["normal", "outlet", "daily_deal"],
      default: "normal",
      index: true,
    },
    promotionRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionRequest",
    },
    originalPrice: { type: Number }, // Frozen price before promotion
    discountPercent: { type: Number }, // For display
    dealStartDate: { type: Date },
    dealEndDate: { type: Date },
    dealQuantityLimit: { type: Number },
    dealQuantitySold: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // We manage createdAt/updatedAt manually
  },
);

productSchema.index({
  sellerId: 1,
  listingStatus: 1,
  promotionType: 1,
  categoryId: 1,
  price: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Product", productSchema);
