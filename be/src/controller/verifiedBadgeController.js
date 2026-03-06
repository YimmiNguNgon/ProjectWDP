
const mongoose = require("mongoose");
const {
    evaluateVerifiedBadge,
    runVerifiedBadgeCheckForAllSellers,
    getSellerBadgeStatus,
    GRANT_THRESHOLDS,
    REVOKE_THRESHOLDS,
} = require("../services/verifiedBadgeService");
const VerifiedBadge = require("../models/VerifiedBadge");


exports.getSellerBadge = async (req, res, next) => {
    try {
        const { sellerId } = req.params;
        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid sellerId" });
        }

        const badge = await getSellerBadgeStatus(sellerId);

        return res.json({
            data: {
                sellerId,
                isVerified: badge?.isVerified ?? false,
                verifiedAt: badge?.verifiedAt ?? null,
                lastCheckedAt: badge?.lastCheckedAt ?? null,
                // Chỉ trả metrics summary cho buyer, không trả revokeReason
                metrics: badge
                    ? {
                        ordersLast30Days: badge.ordersLast30Days,
                        completionRate: (badge.completionRate * 100).toFixed(1) + "%",
                        trustScore: badge.trustScore,
                        accountAgeMonths: badge.accountAgeMonths,
                    }
                    : null,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/verified-badge/my-badge
 * Protected (seller): Seller xem badge của mình + lý do nếu bị thu hồi
 */
exports.getMyBadge = async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        const badge = await getSellerBadgeStatus(sellerId);

        return res.json({
            data: {
                isVerified: badge?.isVerified ?? false,
                verifiedAt: badge?.verifiedAt ?? null,
                revokedAt: badge?.revokedAt ?? null,
                revokeReason: badge?.revokeReason ?? "",
                lastCheckedAt: badge?.lastCheckedAt ?? null,
                metrics: badge
                    ? {
                        ordersLast30Days: badge.ordersLast30Days,
                        completionRate: (badge.completionRate * 100).toFixed(1) + "%",
                        trustScore: badge.trustScore,
                        accountAgeMonths: badge.accountAgeMonths,
                    }
                    : null,
                // Thresholds để seller biết cần cải thiện gì
                thresholds: {
                    grant: {
                        ordersLast30Days: GRANT_THRESHOLDS.ordersLast30Days,
                        completionRate: (GRANT_THRESHOLDS.completionRate * 100) + "%",
                        trustScore: GRANT_THRESHOLDS.trustScore,
                        accountAgeMonths: GRANT_THRESHOLDS.accountAgeMonths,
                    },
                    revoke: {
                        completionRateBelow: (REVOKE_THRESHOLDS.completionRate * 100) + "%",
                        trustScoreBelow: REVOKE_THRESHOLDS.trustScore,
                    },
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/verified-badge/seller/:sellerId/recalculate
 * Protected (admin): Force tính lại badge cho 1 seller
 */
exports.recalculateSellerBadge = async (req, res, next) => {
    try {
        const { sellerId } = req.params;
        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid sellerId" });
        }

        const result = await evaluateVerifiedBadge(sellerId);
        return res.json({
            message: "Badge recalculated",
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/verified-badge/recalculate-all
 * Protected (admin): Trigger full badge check cho toàn bộ sellers
 */
exports.recalculateAllBadges = async (req, res, next) => {
    try {
        const result = await runVerifiedBadgeCheckForAllSellers();
        return res.json({ message: "Badge check completed for all sellers", ...result });
    } catch (err) {
        next(err);
    }
};
