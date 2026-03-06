const mongoose = require("mongoose");

/**
 * VerifiedBadge – Theo dõi trạng thái badge "Verified Seller" của seller.
 *
 * Điều kiện CẤP badge:
 *   - ordersLast30Days ≥ 30
 *   - completionRate ≥ 0.90
 *   - trustScore ≥ 4.0
 *   - accountAgeMonths ≥ 3
 *
 * Điều kiện MẤT badge:
 *   - completionRate < 0.85  OR
 *   - trustScore < 3.8
 */
const verifiedBadgeSchema = new mongoose.Schema(
    {
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        // Trạng thái hiện tại
        isVerified: { type: Boolean, default: false },

        // Snapshot các chỉ số tại lần cấp/mất gần nhất
        ordersLast30Days: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        trustScore: { type: Number, default: 0 },
        accountAgeMonths: { type: Number, default: 0 },

        // Lịch sử
        verifiedAt: { type: Date, default: null },       // Lần gần nhất được cấp badge
        revokedAt: { type: Date, default: null },        // Lần gần nhất mất badge
        revokeReason: { type: String, default: "" },     // Lý do mất badge

        lastCheckedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("VerifiedBadge", verifiedBadgeSchema);
