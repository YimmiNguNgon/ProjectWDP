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
    note: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema({
  orderId: {
    // Thêm field orderId
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
  shipper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  returnShipper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
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
  voucherGlobal: {
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
  voucherSeller: {
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
  discountBreakdown: {
    globalAllocated: { type: Number, default: 0 },
    sellerDiscount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
  },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      "created",
      "packaging",
      "ready_to_ship",
      "queued",      // Đang chờ shipper (tất cả shipper đầy slot)
      "shipping",
      "delivered",
      "completed",
      "cancelled",
      "failed",
      "waiting_return_shipment",
      "return_shipping",
      "delivered_to_seller",
      "returned",
    ],
    default: "created",
    index: true,
  },

  // Thời điểm đưa vào queue – dùng để FIFO khi auto-assign
  queuedAt: { type: Date, default: null },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "failed", "refunded"],
    default: "unpaid",
    index: true,
  },

  // Timestamp khi đơn chuyển sang delivered (dùng cho 7-ngày refund window)
  deliveredAt: { type: Date, default: null },

  // Shipping information
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
  trackingNumber: { type: String, default: "" },
  shippingLabel: { type: String, default: "" }, // URL to PDF label
  estimatedDelivery: { type: Date },

  // Status history
  statusHistory: [
    {
      status: {
        type: String,
        enum: [
          "created",
          "packaging",
          "ready_to_ship",
          "queued",
          "shipping",
          "delivered",
          "completed",
          "cancelled",
          "failed",
          "waiting_return_shipment",
          "return_shipping",
          "delivered_to_seller",
          "returned",
        ],
      },
      timestamp: { type: Date, default: Date.now },
      note: { type: String, default: "" },
    },
  ],

  orderGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrderGroup",
    default: null,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.index({ orderId: 1 }, { unique: false }); // Allow multiple items under same parent group order

module.exports = mongoose.model("Order", orderSchema);
