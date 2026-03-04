const mongoose = require("mongoose");

/**
 * SellerTrustScore – lưu điểm uy tín tổng hợp của seller.
 * Được tính lại sau mỗi đơn DELIVERED, review mới, hoặc cron job hàng ngày.
 */
const sellerTrustScoreSchema = new mongoose.Schema(
    {
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        // ── Weighted Rating Score (Bayesian) ─────────────────────────
        ratingScore: { type: Number, default: 0 },   // R weighted (0-5)
        reviewCount: { type: Number, default: 0 },   // v
        avgRating: { type: Number, default: 0 },      // R raw

        // ── Component Scores (đã chuẩn hoá về thang 0-5) ─────────────
        completionRateScore: { type: Number, default: 0 },  // CompletionRate × 5
        responseRateScore: { type: Number, default: 0 },    // ResponseRate × 5
        disputeScore: { type: Number, default: 5 },          // (1 - disputeRate) × 5
        stabilityScore: { type: Number, default: 0 },        // min(ageMonths/24,1) × 5

        // ── Raw metrics (để hiển thị cho buyer) ──────────────────────
        completionRate: { type: Number, default: 0 },   // % đơn hoàn thành
        responseRate: { type: Number, default: 0 },     // % phản hồi trong 24h
        disputeRate: { type: Number, default: 0 },      // % khiếu nại
        accountAgeMonths: { type: Number, default: 0 }, // tuổi tài khoản (tháng)
        totalDelivered: { type: Number, default: 0 },   // tổng đơn delivered

        // ── Final weighted score ─────────────────────────────────────
        finalScore: { type: Number, default: 0 },  // 0-5

        // ── Tier phân loại ───────────────────────────────────────────
        // "TRUSTED" | "STANDARD" | "RISK" | "HIGH_RISK"
        tier: {
            type: String,
            enum: ["TRUSTED", "STANDARD", "RISK", "HIGH_RISK"],
            default: "STANDARD",
        },

        // ── Moderation mode cho sản phẩm mới ─────────────────────────
        // "AUTO_APPROVED" | "RANDOM_CHECK" | "REQUIRE_ADMIN" | "BLOCKED"
        productModerationMode: {
            type: String,
            enum: ["AUTO_APPROVED", "RANDOM_CHECK", "REQUIRE_ADMIN", "BLOCKED"],
            default: "REQUIRE_ADMIN",
        },

        // ── Dynamic Risk Flag ─────────────────────────────────────────
        riskFlagged: { type: Boolean, default: false },
        riskFlagReason: { type: String, default: "" },
        underMonitoring: { type: Boolean, default: false },

        // Metrics 30 ngày
        totalOrders30Days: { type: Number, default: 0 },
        refundCount30Days: { type: Number, default: 0 },
        disputeCount30Days: { type: Number, default: 0 },
        consecutiveReportedOrders: { type: Number, default: 0 },

        lastCalculatedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SellerTrustScore", sellerTrustScoreSchema);
