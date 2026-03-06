const mongoose = require("mongoose");

/**
 * RefundRequest – Đơn yêu cầu hoàn hàng của buyer.
 *
 * Điều kiện buyer được tạo:
 *   - order.status = "delivered"
 *   - thời gian từ khi giao ≤ 7 ngày
 *
 * Ảnh hưởng Trust Score:
 *   - SELLER_FAULT  → returnedOrders++  → CompletionRate giảm
 *   - BUYER_FAULT   → không tính vào returned
 *   - dispute → Complaint++             → DisputeScore giảm
 */
const refundRequestSchema = new mongoose.Schema(
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
            index: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Nội dung yêu cầu
        reason: {
            type: String,
            enum: [
                "ITEM_NOT_RECEIVED",
                "ITEM_DAMAGED",
                "WRONG_ITEM",
                "NOT_AS_DESCRIBED",
                "CHANGE_OF_MIND",
                "OTHER",
            ],
            required: true,
        },
        description: { type: String, default: "" },

        // Ai lỗi → ảnh hưởng Trust Score
        faultType: {
            type: String,
            enum: ["SELLER_FAULT", "BUYER_FAULT", "LOGISTICS_FAULT", "PENDING_REVIEW"],
            default: "PENDING_REVIEW",
        },

        status: {
            type: String,
            enum: [
                "PENDING",         // Buyer vừa tạo, chờ seller xử lý
                "APPROVED",        // Seller duyệt
                "REJECTED",        // Seller từ chối
                "AUTO_APPROVED",   // Seller không trả lời trong 48h → tự động duyệt
                "DISPUTED",        // Buyer mở dispute sau khi seller reject
                "ADMIN_APPROVED",  // Admin duyệt dispute
                "ADMIN_REJECTED",  // Admin từ chối dispute
                "CANCELLED",       // Buyer huỷ request
            ],
            default: "PENDING",
            index: true,
        },

        // Timestamps
        requestedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date, default: null },     // Khi seller hoặc admin phản hồi
        autoApproveAt: { type: Date, default: null },  // Thời hạn 48h auto-approve

        // Phản hồi
        sellerNote: { type: String, default: "" },
        adminNote: { type: String, default: "" },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Tracking ảnh hưởng Trust Score
        trustImpactApplied: { type: Boolean, default: false }, // Đã tính vào trust score chưa
    },
    { timestamps: true }
);

module.exports = mongoose.model("RefundRequest", refundRequestSchema);
