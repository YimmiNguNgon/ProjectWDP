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
    selectedVariants: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    variantKey: {
      type: String,
      default: "",
      index: true,
    },
    variantSku: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

cartItemSchema.index({ cart: 1, product: 1, variantKey: 1 }, { unique: true });

module.exports = mongoose.model("CartItem", cartItemSchema);
