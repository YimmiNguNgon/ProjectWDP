const mongoose = require("mongoose");

const revenueSchema = new mongoose.Schema(
  {
    // "system_commission" = 5% từ đơn hàng vào hệ thống
    // "system_shipping"   = tiền ship vào hệ thống
    // "seller_revenue"    = 95% từ đơn hàng vào seller
    type: {
      type: String,
      enum: ["system_commission", "system_shipping", "seller_revenue"],
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderGroup",
      default: null,
      index: true,
    },
    // Chỉ có giá trị với type = "seller_revenue"
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    amount: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Revenue", revenueSchema);
