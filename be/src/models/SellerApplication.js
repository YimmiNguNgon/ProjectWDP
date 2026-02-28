const mongoose = require("mongoose");

const sellerApplicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        shopName: { type: String, required: true, trim: true },
        productDescription: { type: String, required: true, trim: true },
        // status luôn là "approved" vì hệ thống tự động duyệt
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
            index: true,
        },
        adminNote: { type: String, default: "" },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SellerApplication", sellerApplicationSchema);
