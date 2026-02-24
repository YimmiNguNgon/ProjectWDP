const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: [
                "seller_application_approved",
                "seller_application_rejected",
                "new_message",
                "order_placed",
                "order_status_changed",
                "new_review",
                "user_banned",
                "user_unbanned",
                "product_created",
                "admin_broadcast",
            ],
            required: true,
        },
        title: { type: String, required: true },
        body: { type: String, required: true },
        link: { type: String, default: "" },
        isRead: { type: Boolean, default: false, index: true },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
