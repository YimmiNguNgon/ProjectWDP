const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: String, // denormalized snapshot
    price: Number, // price at purchase
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  buyer: {
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
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      "created",
      "paid",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "failed",
      "returned",
    ],
    default: "created",
    index: true,
  },

  // Shipping information
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  trackingNumber: { type: String, default: "" },
  shippingLabel: { type: String, default: "" }, // URL to PDF label
  estimatedDelivery: { type: Date },

  // Status history
  statusHistory: [{
    status: {
      type: String,
      enum: [
        "created",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "failed",
        "returned",
      ],
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
