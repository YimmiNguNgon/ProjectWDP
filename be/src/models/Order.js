const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: String,
    unitPrice: Number,  
    quantity: { type: Number, default: 1 },
    selectedVariants: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    variantSku: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  orderId: {  // Thêm field orderId
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    index: true,
  },
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
  subtotalAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  voucher: {
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
    code: { type: String, default: "" },
    type: {
      type: String,
      enum: ["percentage", "fixed", ""],
      default: "",
    },
    value: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
  },
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

orderSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model("Order", orderSchema);
