const { evaluateSellerTrust, runTrustScoreForAllSellers } = require("../services/sellerTrustService");
const SellerTrustScore = require("../models/SellerTrustScore");
const VerifiedBadge = require("../models/VerifiedBadge");
const User = require("../models/User");
const mongoose = require("mongoose");

/**
 * GET /api/trust-score/seller/:sellerId
 * Public: Buyer xem điểm uy tín của seller
 */
exports.getSellerTrustScore = async (req, res, next) => {
    try {
        const { sellerId } = req.params;
        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid sellerId" });
        }

        let trustDoc = await SellerTrustScore.findOne({ seller: sellerId }).lean();

        // Tính lần đầu nếu chưa có
        if (!trustDoc) {
            trustDoc = await evaluateSellerTrust(sellerId, "CRON_JOB");
        }

        // Lấy verified badge status
        const badgeDoc = await VerifiedBadge.findOne({ seller: sellerId })
            .select("isVerified verifiedAt")
            .lean();

        return res.json({
            data: {
                sellerId,
                finalScore: trustDoc.finalScore,
                tier: trustDoc.tier,
                badge: getBadgeLabel(trustDoc.tier),
                isVerifiedSeller: badgeDoc?.isVerified ?? false,
                verifiedAt: badgeDoc?.verifiedAt ?? null,

                // Stats for buyer UI
                avgRating: trustDoc.avgRating,
                reviewCount: trustDoc.reviewCount,
                completionRate: (trustDoc.completionRate * 100).toFixed(1),
                totalDelivered: trustDoc.totalDelivered,
                responseRate: (trustDoc.responseRate * 100).toFixed(1),
                disputeRate: (trustDoc.disputeRate * 100).toFixed(1),
                accountAgeMonths: trustDoc.accountAgeMonths,

                // Component scores (for breakdown display)
                breakdown: {
                    ratingScore: trustDoc.ratingScore,
                    completionRateScore: trustDoc.completionRateScore,
                    responseRateScore: trustDoc.responseRateScore,
                    disputeScore: trustDoc.disputeScore,
                    stabilityScore: trustDoc.stabilityScore,
                },

                lastCalculatedAt: trustDoc.lastCalculatedAt,
            },
        });
    } catch (err) {
        next(err);
    }
};


/**
 * POST /api/trust-score/seller/:sellerId/recalculate
 * Protected (admin only): Force recalculate
 */
exports.recalculateSellerTrustScore = async (req, res, next) => {
    try {
        const { sellerId } = req.params;
        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid sellerId" });
        }

        const result = await evaluateSellerTrust(sellerId, "MANUAL");
        return res.json({ message: "Trust score recalculated", data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/trust-score/recalculate-all
 * Protected (admin only): Recalculate all sellers
 */
exports.recalculateAllSellers = async (req, res, next) => {
    try {
        const result = await runTrustScoreForAllSellers();
        return res.json({ message: "Recalculated all sellers", ...result });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/trust-score/my-score
 * Protected (seller): View own trust score
 */
exports.getMyTrustScore = async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        let trustDoc = await SellerTrustScore.findOne({ seller: sellerId }).lean();

        if (!trustDoc) {
            trustDoc = await evaluateSellerTrust(sellerId, "CRON_JOB");
        }

        return res.json({
            data: {
                finalScore: trustDoc.finalScore,
                tier: trustDoc.tier,
                badge: getBadgeLabel(trustDoc.tier),
                productModerationMode: trustDoc.productModerationMode,
                breakdown: {
                    ratingScore: trustDoc.ratingScore,
                    completionRateScore: trustDoc.completionRateScore,
                    responseRateScore: trustDoc.responseRateScore,
                    disputeScore: trustDoc.disputeScore,
                    stabilityScore: trustDoc.stabilityScore,
                },
                metrics: {
                    avgRating: trustDoc.avgRating,
                    reviewCount: trustDoc.reviewCount,
                    completionRate: (trustDoc.completionRate * 100).toFixed(1) + "%",
                    responseRate: (trustDoc.responseRate * 100).toFixed(1) + "%",
                    disputeRate: (trustDoc.disputeRate * 100).toFixed(1) + "%",
                    accountAgeMonths: trustDoc.accountAgeMonths,
                },
                lastCalculatedAt: trustDoc.lastCalculatedAt,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ── Helper ────────────────────────────────────────────────────────────────────
function getBadgeLabel(tier) {
    switch (tier) {
        case "TRUSTED": return "Trusted Seller";
        case "WARNING": return "Warning";
        case "HIGH_RISK": return "High Risk";
        default: return "Trusted Seller";
    }
}


module.exports = exports;
