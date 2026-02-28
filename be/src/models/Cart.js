const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "converted", "abandoned"],
      default: "active",
    },
  },
  { timestamps: true },
);

cartSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

module.exports = mongoose.model("Cart", cartSchema);
