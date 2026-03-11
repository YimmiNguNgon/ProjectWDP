const mongoose = require("mongoose");

/**
 * SellerRiskHistory – lịch sử các lần gắn/gỡ cờ rủi ro của seller.
 */
const sellerRiskHistorySchema = new mongoose.Schema(
    {
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        action: {
            type: String,
            enum: ["FLAG_SET", "FLAG_CLEARED", "MONITORING_SET", "TIER_CHANGED"],
            required: true,
        },
        previousTier: { type: String },
        newTier: { type: String },
        riskFlagged: { type: Boolean },
        underMonitoring: { type: Boolean },

        // Snapshot metrics tại thời điểm đánh giá
        metrics: {
            totalOrders30Days: Number,
            refundCount30Days: Number,
            disputeCount30Days: Number,
            consecutiveReportedOrders: Number,
            adjustedRefundRate: Number,
            disputeRate: Number,
            finalScore: Number,
        },
        reason: { type: String },
        triggeredBy: {
            type: String,
            enum: ["ORDER_DELIVERED", "DISPUTE_CREATED", "REFUND_CREATED", "REPORT_VERIFIED", "CRON_JOB", "MANUAL"],
            default: "CRON_JOB",
        },
    },
    { timestamps: true }
);

sellerRiskHistorySchema.index({ seller: 1, createdAt: -1 });

module.exports = mongoose.model("SellerRiskHistory", sellerRiskHistorySchema);
