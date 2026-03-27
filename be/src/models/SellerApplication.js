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
        phone: { type: String, default: "" },
        shopAddress: {
            city: { type: String, default: "" },
            district: { type: String, default: "" },
            ward: { type: String, default: "" },
            street: { type: String, default: "" },
            detail: { type: String, default: "" },
        },
        productDescription: { type: String, required: true, trim: true },
        businessImages: [{ type: String }], // array of 2 Cloudinary URLs
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
