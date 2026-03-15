/**
 * sellerTrustService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seller Trust Score & Tier-based Product Moderation
 *
 * Formula (Weighted Multi-Component):
 *   FinalScore = 0.4×RatingScore + 0.2×CompletionRateScore
 *              + 0.1×ResponseRateScore + 0.15×DisputeScore + 0.15×StabilityScore
 *
 * Bayesian Rating (prevent manipulation with few reviews):
 *   RatingScore = (v/(v+m))×R + (m/(v+m))×C
 *
 * Tiers & Moderation:
 *   ≥ 4.0        → TRUSTED    → AUTO_APPROVED  → listingStatus: active
 *   3.0 – 3.99   → WARNING    → AUTO_APPROVED  → listingStatus: active (+ gửi cảnh báo)
 *   < 3.0        → HIGH_RISK  → REQUIRE_ADMIN  → listingStatus: pending_review
 */

const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Complaint = require("../models/Complaint");
const Report = require("../models/Report");
const SellerTrustScore = require("../models/SellerTrustScore");
const notificationService = require("./notificationService");

// ── Constants ─────────────────────────────────────────────────────────────────
const BAYESIAN_M = 50; // minimum review threshold
const SCORE_WEIGHTS = {
    rating: 0.40,
    completion: 0.20,
    response: 0.10,
    dispute: 0.15,
    stability: 0.15,
};

const TIER_THRESHOLDS = {
    TRUSTED: 4.0,   // ≥ 4.0
    WARNING: 3.0,   // 3.0 – 3.99 (auto-approve nhưng gửi cảnh báo)
    // < 3.0 → HIGH_RISK
};

// ── Tier classification ───────────────────────────────────────────────────────
function classifyTier(score) {
    if (score >= TIER_THRESHOLDS.TRUSTED) return "TRUSTED";
    if (score >= TIER_THRESHOLDS.WARNING) return "WARNING";
    return "HIGH_RISK";
}

/**
 * Moderation mode dựa hoàn toàn vào tier:
 *   TRUSTED   → AUTO_APPROVED  (active)
 *   WARNING   → AUTO_APPROVED  (active, nhưng seller nhận cảnh báo riêng)
 *   HIGH_RISK → REQUIRE_ADMIN  (pending_review)
 */
function getModerationMode(tier) {
    switch (tier) {
        case "TRUSTED": return "AUTO_APPROVED";
        case "WARNING": return "AUTO_APPROVED";
        case "HIGH_RISK": return "REQUIRE_ADMIN";
        default: return "REQUIRE_ADMIN";
    }
}

// ── Get global system average rating ─────────────────────────────────────────
async function getSystemAvgRating() {
    const agg = await Review.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);
    return agg[0]?.avg ?? 3.0;
}

// ── Compute all metrics for a seller ─────────────────────────────────────────
async function computeTrustMetrics(sellerId, seller) {
    const now = new Date();

    // 1. Rating score (Bayesian)
    const reviewAgg = await Review.aggregate([
        { $match: { seller: sellerId, deletedAt: null } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const R = reviewAgg[0]?.avg ?? 0;
    const v = reviewAgg[0]?.count ?? 0;
    const C = await getSystemAvgRating();
    const m = BAYESIAN_M;
    const ratingScore = v > 0 ? (v / (v + m)) * R + (m / (v + m)) * C : C;

    // 2. Completion Rate = delivered / (delivered + cancelled + returned)
    const totalFinished = await Order.countDocuments({
        seller: sellerId,
        status: { $in: ["delivered", "cancelled", "returned"] },
    });
    const delivered = await Order.countDocuments({
        seller: sellerId,
        status: "delivered",
    });
    const completionRate = totalFinished > 0 ? delivered / totalFinished : 1.0;
    const completionRateScore = completionRate * 5;

    // 3. Response Rate
    const rawResponseRate = seller?.sellerInfo?.responseRate ?? 0.8;
    const responseRateScore = rawResponseRate * 5;

    // 4. Dispute Score = (1 - disputeRate) × 5
    //    totalComplaints = APPROVED Complaint docs + VALID Report docs
    const [complaintCount, validReportCount] = await Promise.all([
        Complaint.countDocuments({ seller: sellerId, resolution: "APPROVED" }),
        Report.countDocuments({ seller: sellerId, status: "VALID" }),
    ]);
    const totalComplaints = complaintCount + validReportCount;
    const totalOrders = await Order.countDocuments({ seller: sellerId });
    const disputeRate = totalOrders > 0 ? totalComplaints / totalOrders : 0;
    const disputeScore = (1 - Math.min(disputeRate, 1)) * 5;

    // 5. Stability = min(accountAgeMonths / 24, 1) × 5
    const registeredAt = seller?.sellerInfo?.registeredAt ?? seller?.createdAt ?? now;
    const accountAgeMonths = (now - new Date(registeredAt)) / (1000 * 60 * 60 * 24 * 30);
    const stabilityScore = Math.min(accountAgeMonths / 24, 1) * 5;

    // ── RISK MONITORING: 30-day Refunds ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const orders30Days = await Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: thirtyDaysAgo }
    });
    const RefundRequest = require("../models/RefundRequest");
    const refunds30Days = await RefundRequest.countDocuments({
        seller: sellerId,
        requestedAt: { $gte: thirtyDaysAgo }
    });

    // refundRate = refunds30Days / max(orders30Days, 20)
    const refundRate = refunds30Days / Math.max(orders30Days, 20);
    const riskFlagged = refundRate > 0.15;

    // 6. Final weighted score
    const finalScore =
        SCORE_WEIGHTS.rating * ratingScore +
        SCORE_WEIGHTS.completion * completionRateScore +
        SCORE_WEIGHTS.response * responseRateScore +
        SCORE_WEIGHTS.dispute * disputeScore +
        SCORE_WEIGHTS.stability * stabilityScore;

    return {
        ratingScore: parseFloat(ratingScore.toFixed(4)),
        reviewCount: v,
        avgRating: parseFloat(R.toFixed(4)),
        completionRate: parseFloat(completionRate.toFixed(4)),
        completionRateScore: parseFloat(completionRateScore.toFixed(4)),
        totalDelivered: delivered,
        responseRate: parseFloat(rawResponseRate.toFixed(4)),
        responseRateScore: parseFloat(responseRateScore.toFixed(4)),
        disputeRate: parseFloat(disputeRate.toFixed(4)),
        disputeScore: parseFloat(disputeScore.toFixed(4)),
        accountAgeMonths: parseFloat(accountAgeMonths.toFixed(2)),
        stabilityScore: parseFloat(stabilityScore.toFixed(4)),
        finalScore: parseFloat(Math.min(finalScore, 5).toFixed(4)),
        orders30Days,
        refunds30Days,
        refundRate: parseFloat(refundRate.toFixed(4)),
        riskFlagged,
    };
}

// ── Main: evaluate and persist trust score ────────────────────────────────────

async function evaluateSellerTrust(sellerId, triggeredBy = "CRON_JOB") {
    const seller = await User.findById(sellerId)
        .select("username sellerInfo createdAt sellerStage")
        .lean();

    if (!seller) throw new Error(`Seller not found: ${sellerId}`);

    const metrics = await computeTrustMetrics(sellerId, seller);
    const tier = classifyTier(metrics.finalScore);
    let productModerationMode = getModerationMode(tier);

    // Dynamic Risk Flag Overrides Moderation Mode
    if (metrics.riskFlagged) {
        productModerationMode = "REQUIRE_ADMIN";
    }

    // Load existing record để so sánh tier thay đổi

    const existing = await SellerTrustScore.findOne({ seller: sellerId }).lean();
    const previousTier = existing?.tier;

    const updatedDoc = await SellerTrustScore.findOneAndUpdate(
        { seller: sellerId },
        {
            $set: {
                seller: sellerId,
                ...metrics,
                tier,
                productModerationMode,
                lastCalculatedAt: new Date(),
            },
        },
        { upsert: true, new: true }
    );

    // Gửi cảnh báo nếu seller vừa rơi vào vùng WARNING
    const tierChanged = previousTier && previousTier !== tier;
    if (tierChanged && tier === "WARNING") {
        try {
            await notificationService.sendNotification({
                recipientId: sellerId,
                type: "trust_score_warning",
                title: "⚠️ Your trust score is decreasing",
                body: `Your current trust score: ${metrics.finalScore.toFixed(2)}/5.0. If it continues to drop below 3.0, new products will require admin approval before being displayed.`,
                link: "/seller/trust-score",
                metadata: { finalScore: metrics.finalScore, tier },
            });
        } catch (e) {
            console.error("[TrustScore] Failed to send warning notification:", e.message);
        }
    }

    // Gửi cảnh báo nếu seller vừa rơi vào HIGH_RISK
    if (tierChanged && tier === "HIGH_RISK") {
        try {
            await notificationService.sendNotification({
                recipientId: sellerId,
                type: "trust_score_high_risk",
                title: "🚨 Account needs attention – Products will require approval",
                body: `Trust score: ${metrics.finalScore.toFixed(2)}/5.0 (below 3.0). All new products will require admin approval before appearing on the platform.`,
                link: "/seller/trust-score",
                metadata: { finalScore: metrics.finalScore, tier },
            });
        } catch (e) {
            console.error("[TrustScore] Failed to send high-risk notification:", e.message);
        }
    }

    // Sync avgRating lên User.sellerInfo
    await User.findByIdAndUpdate(sellerId, {
        "sellerInfo.avgRating": parseFloat(metrics.avgRating.toFixed(2)),
        "sellerInfo.successOrders": metrics.totalDelivered,
    });

    console.log(
        `[TrustScore] ${seller.username}: score=${metrics.finalScore.toFixed(2)} tier=${tier} mode=${productModerationMode}`
    );

    return updatedDoc;
}

// ── Run for all sellers (used by cron job) ────────────────────────────────────
async function runTrustScoreForAllSellers() {
    console.log("[TrustScore] Starting trust score calculation for all sellers...");
    const sellers = await User.find({ role: "seller", status: "active" })
        .select("_id username")
        .lean();

    let success = 0, failed = 0;
    for (const seller of sellers) {
        try {
            await evaluateSellerTrust(seller._id, "CRON_JOB");
            success++;
        } catch (err) {
            console.error(`[TrustScore] Error processing seller ${seller._id}:`, err.message);
            failed++;
        }
    }
    console.log(`[TrustScore] Completed: ${success} success, ${failed} failed / ${sellers.length} sellers`);
    return { success, failed, total: sellers.length };
}

// ── Decide product moderation on creation ────────────────────────────────────
async function decideModerationStatus(sellerId) {
    let trustDoc = await SellerTrustScore.findOne({ seller: sellerId }).lean();

    // Nếu chưa có score, tính lần đầu
    if (!trustDoc) {
        trustDoc = await evaluateSellerTrust(sellerId, "INITIAL");
    }

    const mode = trustDoc.productModerationMode;
    const tier = trustDoc.tier;

    // TRUSTED & WARNING → active (WARNING chỉ nhận cảnh báo, không bị block)
    // HIGH_RISK → pending_review
    let listingStatus;
    if (tier === "HIGH_RISK") {
        listingStatus = "pending_review";
    } else {
        listingStatus = "active";
    }

    return { listingStatus, mode, tier, finalScore: trustDoc.finalScore };
}

module.exports = {
    evaluateSellerTrust,
    runTrustScoreForAllSellers,
    decideModerationStatus,
    computeTrustMetrics,
};
