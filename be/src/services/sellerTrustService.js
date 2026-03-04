/**
 * sellerTrustService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic Seller Trust Score & Risk-based Product Moderation
 *
 * Formula (Weighted Multi-Component):
 *   FinalScore = 0.4×RatingScore + 0.2×CompletionRateScore
 *              + 0.1×ResponseRateScore + 0.15×DisputeScore + 0.15×StabilityScore
 *
 * Bayesian Rating (prevent manipulation with few reviews):
 *   RatingScore = (v/(v+m))×R + (m/(v+m))×C
 *   Where: R=seller avg, v=review count, m=50 (min threshold), C=system avg
 *
 * Tiers:
 *   ≥ 4.5  → TRUSTED      → AUTO_APPROVED
 *   4.0-4.49→ STANDARD     → RANDOM_CHECK (20%)
 *   3.0-3.99→ RISK         → REQUIRE_ADMIN
 *   < 3.0  → HIGH_RISK    → BLOCKED
 */

const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Complaint = require("../models/Complaint");
const SellerTrustScore = require("../models/SellerTrustScore");
const SellerRiskHistory = require("../models/SellerRiskHistory");
const notificationService = require("./notificationService");

// ── Constants ─────────────────────────────────────────────────────────────────
const BAYESIAN_M = 50;          // minimum review threshold
const SCORE_WEIGHTS = {
    rating: 0.40,
    completion: 0.20,
    response: 0.10,
    dispute: 0.15,
    stability: 0.15,
};

const TIER_THRESHOLDS = {
    TRUSTED: 4.5,
    STANDARD: 4.0,
    RISK: 3.0,
    // below 3.0 → HIGH_RISK
};

// ── Tier classification ───────────────────────────────────────────────────────
function classifyTier(score) {
    if (score >= TIER_THRESHOLDS.TRUSTED) return "TRUSTED";
    if (score >= TIER_THRESHOLDS.STANDARD) return "STANDARD";
    if (score >= TIER_THRESHOLDS.RISK) return "RISK";
    return "HIGH_RISK";
}

function getModerationMode(tier, riskFlagged) {
    if (riskFlagged) return "REQUIRE_ADMIN";
    switch (tier) {
        case "TRUSTED": return "AUTO_APPROVED";
        case "STANDARD": return "RANDOM_CHECK";
        case "RISK": return "REQUIRE_ADMIN";
        case "HIGH_RISK": return "BLOCKED";
        default: return "REQUIRE_ADMIN";
    }
}

// ── Get global system average rating ─────────────────────────────────────────
async function getSystemAvgRating() {
    const agg = await Review.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);
    return agg[0]?.avg ?? 3.0; // Default: 3.0 nếu chưa có review
}

// ── Compute all metrics for a seller ─────────────────────────────────────────
async function computeTrustMetrics(sellerId, seller) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // 1. Rating score (Bayesian)
    const reviewAgg = await Review.aggregate([
        { $match: { seller: sellerId, deletedAt: null } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const R = reviewAgg[0]?.avg ?? 0;
    const v = reviewAgg[0]?.count ?? 0;
    const C = await getSystemAvgRating();
    const m = BAYESIAN_M;
    // Seller chưa có review → dùng điểm hệ thống làm starting point
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
    // Seller chưa có đơn → mặc định 1.0 (không phạt seller mới)
    const completionRate = totalFinished > 0 ? delivered / totalFinished : 1.0;
    const completionRateScore = completionRate * 5;

    // 3. Response Rate (stub: dùng sellerInfo nếu có, else heuristic từ chat)
    //    Hiện tại dùng sellerInfo.responseRate nếu được cron job ghi vào,
    //    fallback 0.8 (80%) cho seller mới
    const rawResponseRate = seller?.sellerInfo?.responseRate ?? 0.8;
    const responseRateScore = rawResponseRate * 5;

    // 4. Dispute Score = (1 - disputeRate) × 5
    const disputeCount = await Complaint.countDocuments({ seller: sellerId });
    const totalOrders = await Order.countDocuments({ seller: sellerId });
    const disputeRate = totalOrders > 0 ? disputeCount / totalOrders : 0;
    const disputeScore = (1 - Math.min(disputeRate, 1)) * 5;

    // 5. Stability = min(accountAgeMonths / 24, 1) × 5
    const registeredAt = seller?.sellerInfo?.registeredAt ?? seller?.createdAt ?? now;
    const accountAgeMonths = (now - new Date(registeredAt)) / (1000 * 60 * 60 * 24 * 30);
    const stabilityScore = Math.min(accountAgeMonths / 24, 1) * 5;

    // 6. Final weighted score
    const finalScore =
        SCORE_WEIGHTS.rating * ratingScore +
        SCORE_WEIGHTS.completion * completionRateScore +
        SCORE_WEIGHTS.response * responseRateScore +
        SCORE_WEIGHTS.dispute * disputeScore +
        SCORE_WEIGHTS.stability * stabilityScore;

    // 7. Rolling 30-day risk metrics
    const totalOrders30Days = await Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: thirtyDaysAgo },
    });
    const refundCount30Days = await Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: thirtyDaysAgo },
        status: "returned",
    });
    const disputeCount30Days = await Complaint.countDocuments({
        seller: sellerId,
        createdAt: { $gte: thirtyDaysAgo },
    });

    // Consecutive reported orders (orders with complaints in last 30 days, sorted by time)
    const recentOrdersWithComplaints = await Complaint.countDocuments({
        seller: sellerId,
        createdAt: { $gte: thirtyDaysAgo },
    });
    const consecutiveReportedOrders = recentOrdersWithComplaints; // simplified

    return {
        // Rating
        ratingScore: parseFloat(ratingScore.toFixed(4)),
        reviewCount: v,
        avgRating: parseFloat(R.toFixed(4)),
        // Completion
        completionRate: parseFloat(completionRate.toFixed(4)),
        completionRateScore: parseFloat(completionRateScore.toFixed(4)),
        totalDelivered: delivered,
        // Response
        responseRate: parseFloat(rawResponseRate.toFixed(4)),
        responseRateScore: parseFloat(responseRateScore.toFixed(4)),
        // Dispute
        disputeRate: parseFloat(disputeRate.toFixed(4)),
        disputeScore: parseFloat(disputeScore.toFixed(4)),
        // Stability
        accountAgeMonths: parseFloat(accountAgeMonths.toFixed(2)),
        stabilityScore: parseFloat(stabilityScore.toFixed(4)),
        // Final
        finalScore: parseFloat(Math.min(finalScore, 5).toFixed(4)),
        // 30-day risk
        totalOrders30Days,
        refundCount30Days,
        disputeCount30Days,
        consecutiveReportedOrders,
    };
}

// ── Dynamic Risk Evaluation (volume-based) ─────────────────────────────────────
function evaluateDynamicRisk(metrics) {
    const {
        totalOrders30Days,
        refundCount30Days,
        disputeCount30Days,
        consecutiveReportedOrders,
    } = metrics;

    // Chuẩn hoá tỷ lệ (tránh phạt nặng seller ít đơn)
    const adjustedRefundRate = refundCount30Days / Math.max(totalOrders30Days, 20);
    const adjustedDisputeRate = disputeCount30Days / Math.max(totalOrders30Days, 20);

    let riskFlagged = false;
    let underMonitoring = false;
    let reason = "";

    if (totalOrders30Days < 10) {
        // Chưa đủ mẫu → chỉ monitoring, không downgrade
        underMonitoring = true;
        reason = `Ít dữ liệu (${totalOrders30Days} đơn/30 ngày) – đang theo dõi`;
    } else if (totalOrders30Days < 20) {
        // Tier nhỏ: chỉ flag khi consecutive reports ≥ 3
        if (consecutiveReportedOrders >= 3) {
            riskFlagged = true;
            reason = `${consecutiveReportedOrders} báo cáo liên tiếp (volume thấp: ${totalOrders30Days} đơn/30 ngày)`;
        }
    } else if (totalOrders30Days < 100) {
        // Tier trung: các ngưỡng 20%/10%
        if (adjustedRefundRate > 0.20 || adjustedDisputeRate > 0.10 || consecutiveReportedOrders >= 3) {
            riskFlagged = true;
            const parts = [];
            if (adjustedRefundRate > 0.20) parts.push(`refund ${(adjustedRefundRate * 100).toFixed(1)}% > 20%`);
            if (adjustedDisputeRate > 0.10) parts.push(`dispute ${(adjustedDisputeRate * 100).toFixed(1)}% > 10%`);
            if (consecutiveReportedOrders >= 3) parts.push(`${consecutiveReportedOrders} báo cáo liên tiếp`);
            reason = parts.join("; ");
        }
    } else {
        // Tier lớn (≥100 đơn): ngưỡng chặt hơn 10%/5%
        if (adjustedRefundRate > 0.10 || adjustedDisputeRate > 0.05 || consecutiveReportedOrders >= 5) {
            riskFlagged = true;
            const parts = [];
            if (adjustedRefundRate > 0.10) parts.push(`refund ${(adjustedRefundRate * 100).toFixed(1)}% > 10%`);
            if (adjustedDisputeRate > 0.05) parts.push(`dispute ${(adjustedDisputeRate * 100).toFixed(1)}% > 5%`);
            if (consecutiveReportedOrders >= 5) parts.push(`${consecutiveReportedOrders} báo cáo liên tiếp`);
            reason = parts.join("; ");
        }
    }

    return { riskFlagged, underMonitoring, reason, adjustedRefundRate, adjustedDisputeRate };
}

// ── Main: evaluate and persist trust score ─────────────────────────────────────
async function evaluateSellerTrust(sellerId, triggeredBy = "CRON_JOB") {
    const seller = await User.findById(sellerId)
        .select("username sellerInfo createdAt sellerStage")
        .lean();

    if (!seller) throw new Error(`Seller not found: ${sellerId}`);

    const metrics = await computeTrustMetrics(sellerId, seller);
    const { riskFlagged, underMonitoring, reason, adjustedRefundRate, adjustedDisputeRate } =
        evaluateDynamicRisk(metrics);

    const tier = classifyTier(metrics.finalScore);
    const productModerationMode = getModerationMode(tier, riskFlagged);

    // Load existing record (upsert)
    const existing = await SellerTrustScore.findOne({ seller: sellerId }).lean();
    const previousTier = existing?.tier;
    const previousRiskFlagged = existing?.riskFlagged;

    const updatedDoc = await SellerTrustScore.findOneAndUpdate(
        { seller: sellerId },
        {
            $set: {
                seller: sellerId,
                ...metrics,
                riskFlagged,
                riskFlagReason: reason,
                underMonitoring,
                tier,
                productModerationMode,
                lastCalculatedAt: new Date(),
            },
        },
        { upsert: true, new: true }
    );

    // Log history if tier or riskFlag changed
    const tierChanged = previousTier && previousTier !== tier;
    const riskFlagChanged = previousRiskFlagged !== undefined && previousRiskFlagged !== riskFlagged;

    if (tierChanged || riskFlagChanged) {
        const action = riskFlagChanged
            ? riskFlagged ? "FLAG_SET" : "FLAG_CLEARED"
            : "TIER_CHANGED";

        await SellerRiskHistory.create({
            seller: sellerId,
            action,
            previousTier,
            newTier: tier,
            riskFlagged,
            underMonitoring,
            metrics: {
                totalOrders30Days: metrics.totalOrders30Days,
                refundCount30Days: metrics.refundCount30Days,
                disputeCount30Days: metrics.disputeCount30Days,
                consecutiveReportedOrders: metrics.consecutiveReportedOrders,
                adjustedRefundRate,
                disputeRate: adjustedDisputeRate,
                finalScore: metrics.finalScore,
            },
            reason,
            triggeredBy,
        });

        // Notify seller if risk flagged
        if (riskFlagged && !previousRiskFlagged) {
            try {
                await notificationService.sendNotification({
                    recipientId: sellerId,
                    type: "risk_flagged",
                    title: "⚠️ Tài khoản của bạn đang bị theo dõi rủi ro",
                    body: `Hệ thống phát hiện: ${reason}. Các sản phẩm mới sẽ cần admin duyệt.`,
                    link: "/seller",
                    metadata: { reason, tier },
                });
            } catch (e) {
                console.error("[TrustScore] Gửi notification thất bại:", e.message);
            }
        }
    }

    // Sync avgRating lên User.sellerInfo
    await User.findByIdAndUpdate(sellerId, {
        "sellerInfo.avgRating": parseFloat(metrics.avgRating.toFixed(2)),
        "sellerInfo.successOrders": metrics.totalDelivered,
    });

    console.log(
        `[TrustScore] ${seller.username}: score=${metrics.finalScore.toFixed(2)} tier=${tier} risk=${riskFlagged} mode=${productModerationMode}`
    );

    return updatedDoc;
}

// ── Run for all sellers (used by cron job) ─────────────────────────────────────
async function runTrustScoreForAllSellers() {
    console.log("[TrustScore] Bắt đầu tính điểm uy tín toàn bộ sellers...");
    const sellers = await User.find({ role: "seller", status: "active" })
        .select("_id username")
        .lean();

    let success = 0, failed = 0;
    for (const seller of sellers) {
        try {
            await evaluateSellerTrust(seller._id, "CRON_JOB");
            success++;
        } catch (err) {
            console.error(`[TrustScore] Lỗi seller ${seller._id}:`, err.message);
            failed++;
        }
    }
    console.log(`[TrustScore] Hoàn tất: ${success} thành công, ${failed} lỗi / ${sellers.length} sellers`);
    return { success, failed, total: sellers.length };
}

// ── Decide product moderation on creation ─────────────────────────────────────
async function decideModerationStatus(sellerId) {
    let trustDoc = await SellerTrustScore.findOne({ seller: sellerId }).lean();

    // Nếu chưa có score, tính lần đầu
    if (!trustDoc) {
        trustDoc = await evaluateSellerTrust(sellerId, "CRON_JOB");
    }

    const mode = trustDoc.productModerationMode;
    let listingStatus = "active"; // default

    switch (mode) {
        case "AUTO_APPROVED":
            listingStatus = "active";
            break;
        case "RANDOM_CHECK":
            // 20% xác suất cần duyệt
            listingStatus = Math.random() < 0.20 ? "pending_review" : "active";
            break;
        case "REQUIRE_ADMIN":
            listingStatus = "pending_review";
            break;
        case "BLOCKED":
            listingStatus = "blocked";
            break;
        default:
            listingStatus = "pending_review";
    }

    return { listingStatus, mode, tier: trustDoc.tier, finalScore: trustDoc.finalScore };
}

module.exports = {
    evaluateSellerTrust,
    runTrustScoreForAllSellers,
    decideModerationStatus,
    evaluateDynamicRisk,
    computeTrustMetrics,
};
