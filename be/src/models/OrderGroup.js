const mongoose = require("mongoose");

const orderGroupSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "created",
        "packaging",
        "ready_to_ship",
        "shipping",
        "delivered",
        "completed",
        "cancelled",
        "failed",
        "returned",
      ],
      default: "created",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },
    // Shipping information shared across the group (optional)
    // Shipping information shared across the group
    shippingAddress: {
      fullName: String,
      phone: String,
      country: String,
      city: String,
      district: String,
      ward: String,
      street: String,
      detail: String,
    },
    shippingPrice: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "cod" },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OrderGroup", orderGroupSchema);
