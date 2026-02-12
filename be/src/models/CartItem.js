const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceSnapShot: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

cartItemSchema.index({ cartId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("CartItem", cartItemSchema);
