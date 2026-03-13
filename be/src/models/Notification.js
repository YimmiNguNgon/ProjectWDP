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
                "new_order",
                "order_status_changed",
                "order_shipping",
                "order_delivered",
                "order_completed",
                "new_review",
                "user_banned",
                "user_unbanned",
                "product_created",
                "product_warning",
                "admin_broadcast",
                "cart_item_out_of_stock",
                "cart_item_price_changed",
                "watchlist_product_updated",
                "ban_appeal_submitted",
                "ban_appeal_approved",
                "ban_appeal_rejected",
                "delivery_dispute_new",
                "delivery_dispute_responded",
                "delivery_dispute_admin",
                "delivery_dispute_admin_replied",
                "new_complaint",
                "complaint_escalated",
                "complaint_resolved",
                "complaint_reply",
                "new_refund_request",
                "refund_approved",
                "refund_rejected",
                "refund_disputed",
                "refund_resolved",
                "refund_receipt_confirmed",
                "feedback_revision_request"
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
