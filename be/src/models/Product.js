const mongoose = require("mongoose");
require("../models/Category.js");

const productSchema = new mongoose.Schema({
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
  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  isAuction: { type: Boolean, default: false },
  auctionEndTime: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: false // We manage createdAt/updatedAt manually
});

productSchema.index({ sellerId: 1, categoryId: 1, price: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
