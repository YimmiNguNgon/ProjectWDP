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
  imageUrl: { type: String, default: "" },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
  ],
  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

productSchema.index({ sellerId: 1, categories: 1, price: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
