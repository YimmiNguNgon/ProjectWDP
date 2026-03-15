/**
 * verifiedBadgeService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Logic cấp / thu hồi Verified Seller Badge
 *
 * Điều kiện CẤP badge (phải thỏa TẤT CẢ):
 *   1. ordersLast30Days ≥ 30
 *   2. completionRate   ≥ 0.90   (completedOrders / totalOrders)
 *   3. trustScore       ≥ 4.0
 *   4. accountAgeMonths ≥ 3
 *
 * Điều kiện MẤT badge (bất kỳ 1 trong các điều kiện sau):
 *   - completionRate < 0.85
 *   - trustScore     < 3.8
 */

const User = require("../models/User");
const Order = require("../models/Order");
const SellerTrustScore = require("../models/SellerTrustScore");
const VerifiedBadge = require("../models/VerifiedBadge");
const notificationService = require("./notificationService");

// ── Ngưỡng cấp badge ──────────────────────────────────────────────────────────
const GRANT_THRESHOLDS = {
    ordersLast30Days: 30,
    completionRate: 0.90,
    trustScore: 4.0,
    accountAgeMonths: 3,
};

// ── Ngưỡng thu hồi badge ─────────────────────────────────────────────────────
const REVOKE_THRESHOLDS = {
    completionRate: 0.85,
    trustScore: 3.8,
};

// ── Tính toán các chỉ số cho 1 seller ────────────────────────────────────────
async function computeBadgeMetrics(sellerId, seller) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // 1. Đơn trong 30 ngày gần nhất
    const ordersLast30Days = await Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: thirtyDaysAgo },
    });

    // 2. Completion Rate = delivered / (delivered + cancelled + returned)
    const totalOrders = await Order.countDocuments({ seller: sellerId });
    const deliveredOrders = await Order.countDocuments({
        seller: sellerId,
        status: "delivered",
    });
    const completionRate = totalOrders > 0 ? deliveredOrders / totalOrders : 0;

    // 3. Trust Score từ bảng SellerTrustScore
    const trustDoc = await SellerTrustScore.findOne({ seller: sellerId })
        .select("finalScore")
        .lean();
    const trustScore = trustDoc?.finalScore ?? 0;

    // 4. Tuổi tài khoản tính theo tháng
    const registeredAt = seller?.sellerInfo?.registeredAt ?? seller?.createdAt ?? now;
    const accountAgeMonths = (now - new Date(registeredAt)) / (1000 * 60 * 60 * 24 * 30);

    return {
        ordersLast30Days,
        completionRate: parseFloat(completionRate.toFixed(4)),
        trustScore: parseFloat(trustScore.toFixed(4)),
        accountAgeMonths: parseFloat(accountAgeMonths.toFixed(2)),
    };
}

// ── Kiểm tra điều kiện CẤP badge ──────────────────────────────────────────────
function meetsGrantConditions(metrics) {
    return (
        metrics.ordersLast30Days >= GRANT_THRESHOLDS.ordersLast30Days &&
        metrics.completionRate >= GRANT_THRESHOLDS.completionRate &&
        metrics.trustScore >= GRANT_THRESHOLDS.trustScore &&
        metrics.accountAgeMonths >= GRANT_THRESHOLDS.accountAgeMonths
    );
}

// ── Kiểm tra điều kiện THU HỒI badge ─────────────────────────────────────────
function meetsRevokeConditions(metrics) {
    return (
        metrics.completionRate < REVOKE_THRESHOLDS.completionRate ||
        metrics.trustScore < REVOKE_THRESHOLDS.trustScore
    );
}

// ── Lý do thu hồi (để log) ────────────────────────────────────────────────────
function buildRevokeReason(metrics) {
    const reasons = [];
    if (metrics.completionRate < REVOKE_THRESHOLDS.completionRate) {
        reasons.push(`completionRate ${(metrics.completionRate * 100).toFixed(1)}% < 85%`);
    }
    if (metrics.trustScore < REVOKE_THRESHOLDS.trustScore) {
        reasons.push(`trustScore ${metrics.trustScore.toFixed(2)} < 3.8`);
    }
    return reasons.join("; ");
}

// ── Đánh giá và cập nhật badge cho 1 seller ──────────────────────────────────
async function evaluateVerifiedBadge(sellerId) {
    const seller = await User.findById(sellerId)
        .select("username sellerInfo createdAt")
        .lean();

    if (!seller) throw new Error(`Seller not found: ${sellerId}`);

    const metrics = await computeBadgeMetrics(sellerId, seller);

    // Load trạng thái badge hiện tại
    const existing = await VerifiedBadge.findOne({ seller: sellerId }).lean();
    const wasVerified = existing?.isVerified ?? false;

    let isVerified = wasVerified;
    let revokeReason = "";
    const now = new Date();

    if (!wasVerified) {
        // Chưa có badge → kiểm tra điều kiện CẤP
        if (meetsGrantConditions(metrics)) {
            isVerified = true;
        }
    } else {
        // Đã có badge → kiểm tra điều kiện THU HỒI
        if (meetsRevokeConditions(metrics)) {
            isVerified = false;
            revokeReason = buildRevokeReason(metrics);
        }
    }

    // Upsert vào DB
    const updateData = {
        seller: sellerId,
        isVerified,
        ordersLast30Days: metrics.ordersLast30Days,
        completionRate: metrics.completionRate,
        trustScore: metrics.trustScore,
        accountAgeMonths: metrics.accountAgeMonths,
        lastCheckedAt: now,
    };

    if (isVerified && !wasVerified) {
        updateData.verifiedAt = now;
    }
    if (!isVerified && wasVerified) {
        updateData.revokedAt = now;
        updateData.revokeReason = revokeReason;
    }

    await VerifiedBadge.findOneAndUpdate(
        { seller: sellerId },
        { $set: updateData },
        { upsert: true, new: true }
    );

    // Sync field isVerifiedSeller nhanh lên User để query dễ
    await User.findByIdAndUpdate(sellerId, {
        "sellerInfo.isVerifiedSeller": isVerified,
    });

    // Gửi notification khi trạng thái thay đổi
    if (isVerified && !wasVerified) {
        try {
            await notificationService.sendNotification({
                recipientId: sellerId,
                type: "verified_badge_granted",
                title: "✅ Congratulations! You have been granted the Verified Seller Badge",
                body: "Your account has met the criteria for the Verified Seller badge. The badge will appear on your shop and product pages.",
                link: "/seller/trust-score",
                metadata: { ...metrics },
            });
        } catch (e) {
            console.error("[VerifiedBadge] Failed to send grant notification:", e.message);
        }
    }

    if (!isVerified && wasVerified) {
        try {
            await notificationService.sendNotification({
                recipientId: sellerId,
                type: "verified_badge_revoked",
                title: "⚠️ Your Verified Seller Badge has been revoked",
                body: `Reason: ${revokeReason}. Please improve your metrics to be eligible for the badge again.`,
                link: "/seller/trust-score",
                metadata: { ...metrics, revokeReason },
            });
        } catch (e) {
            console.error("[VerifiedBadge] Failed to send revoke notification:", e.message);
        }
    }

    console.log(
        `[VerifiedBadge] ${seller.username}: orders30d=${metrics.ordersLast30Days} completion=${(metrics.completionRate * 100).toFixed(1)}% trust=${metrics.trustScore} age=${metrics.accountAgeMonths}mo → verified=${isVerified}`
    );

    return { sellerId, isVerified, metrics, changed: isVerified !== wasVerified };
}

// ── Chạy cho toàn bộ seller (dùng bởi cron job) ───────────────────────────────
async function runVerifiedBadgeCheckForAllSellers() {
    console.log("[VerifiedBadge] Starting badge check for all sellers...");
    const sellers = await User.find({ role: "seller", status: "active" })
        .select("_id username")
        .lean();

    let granted = 0, revoked = 0, unchanged = 0, failed = 0;
    for (const seller of sellers) {
        try {
            const result = await evaluateVerifiedBadge(seller._id);
            if (result.changed) {
                result.isVerified ? granted++ : revoked++;
            } else {
                unchanged++;
            }
        } catch (err) {
            console.error(`[VerifiedBadge] Error processing seller ${seller._id}:`, err.message);
            failed++;
        }
    }

    console.log(
        `[VerifiedBadge] Completed: ${granted} granted, ${revoked} revoked, ${unchanged} unchanged, ${failed} failed / ${sellers.length} sellers`
    );
    return { granted, revoked, unchanged, failed, total: sellers.length };
}

// ── Lấy badge status cho 1 seller (dùng bởi controller) ─────────────────────
async function getSellerBadgeStatus(sellerId) {
    return VerifiedBadge.findOne({ seller: sellerId }).lean();
}

module.exports = {
    evaluateVerifiedBadge,
    runVerifiedBadgeCheckForAllSellers,
    getSellerBadgeStatus,
    GRANT_THRESHOLDS,
    REVOKE_THRESHOLDS,
};
