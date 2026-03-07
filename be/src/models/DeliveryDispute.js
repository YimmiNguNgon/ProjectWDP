const mongoose = require("mongoose");

const deliveryDisputeSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    // Flow: PENDING_SHIPPER → SHIPPER_RESPONDED → CONFIRMED | REPORTED_TO_ADMIN → CONFIRMED
    status: {
      type: String,
      enum: ["PENDING_SHIPPER", "SHIPPER_RESPONDED", "CONFIRMED", "REPORTED_TO_ADMIN"],
      default: "PENDING_SHIPPER",
      index: true,
    },
    buyerNote: { type: String, default: "" },
    shipperNote: { type: String, default: "" },
    shipperImages: [{ type: String }],

    // Admin phần
    adminNote: { type: String, default: "" },
    adminNotifiedAt: { type: Date, default: null }, // thời điểm admin gửi thông báo cho buyer
  },
  { timestamps: true },
);

module.exports = mongoose.model("DeliveryDispute", deliveryDisputeSchema);
