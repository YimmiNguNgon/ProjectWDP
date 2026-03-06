const mongoose = require("mongoose");

/**
 * SellerTrustScore – lưu điểm uy tín tổng hợp của seller.
 * Được tính lại sau mỗi đơn DELIVERED, review mới, hoặc cron job hàng ngày.
 *
 * Tiers:
 *   TRUSTED   (≥ 4.0) → AUTO_APPROVED  → sản phẩm active ngay
 *   WARNING   (3.0-3.99) → AUTO_APPROVED  → sản phẩm active + gửi cảnh báo seller
 *   HIGH_RISK (< 3.0)  → REQUIRE_ADMIN  → sản phẩm pending_review
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
        ratingScore: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        avgRating: { type: Number, default: 0 },

        // ── Component Scores (0-5) ────────────────────────────────────
        completionRateScore: { type: Number, default: 0 },
        responseRateScore: { type: Number, default: 0 },
        disputeScore: { type: Number, default: 5 },
        stabilityScore: { type: Number, default: 0 },

        // ── Raw metrics ───────────────────────────────────────────────
        completionRate: { type: Number, default: 0 },
        responseRate: { type: Number, default: 0 },
        disputeRate: { type: Number, default: 0 },
        accountAgeMonths: { type: Number, default: 0 },
        totalDelivered: { type: Number, default: 0 },

        // ── Final weighted score (0-5) ────────────────────────────────
        finalScore: { type: Number, default: 0 },

        // ── Tier ─────────────────────────────────────────────────────
        tier: {
            type: String,
            enum: ["TRUSTED", "WARNING", "HIGH_RISK"],
            default: "TRUSTED",
        },

        // ── Moderation mode ───────────────────────────────────────────
        productModerationMode: {
            type: String,
            enum: ["AUTO_APPROVED", "REQUIRE_ADMIN"],
            default: "AUTO_APPROVED",
        },

        lastCalculatedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SellerTrustScore", sellerTrustScoreSchema);
