/**
 * sellerStageService.js
 * ─────────────────────────────────────────────────────────────
 * Logic tự động nâng cấp / hạ cấp Seller stage.
 *
 * PROBATION → NORMAL (nâng cấp) khi ĐỦ TẤT CẢ:
 *   ✅ successOrders >= 20
 *   ✅ avgRating     >= 4.5
 *   ✅ refundRate    <  5%
 *   ✅ Account đã tạo > 30 ngày
 *   ✅ violationCount === 0 (không có báo cáo nghiêm trọng)
 *
 * NORMAL → PROBATION (hạ cấp) khi BẤT KỲ:
 *   ⚠️  avgRating   < 3.5
 *   ⚠️  refundRate  > 10%
 *   ⚠️  reportRate  > 5%
 */

const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Complaint = require("../models/Complaint");
const notificationService = require("./notificationService");

// ─── Tính toán metrics thực tế từ DB ──────────────────────────────────────────
async function computeSellerMetrics(sellerId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Tổng đơn thành công (tất cả thời gian)
    const successOrders = await Order.countDocuments({
        seller: sellerId,
        status: "delivered",
    });

    // Tổng đơn có phí (để tính refund rate - trong 90 ngày gần nhất)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const totalOrdersRecent = await Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: ninetyDaysAgo },
        status: { $in: ["delivered", "returned", "cancelled"] },
    });

    const returnedOrdersRecent = await Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: ninetyDaysAgo },
        status: "returned",
    });

    const refundRate = totalOrdersRecent > 0
        ? (returnedOrdersRecent / totalOrdersRecent) * 100
        : 0;

    // Rating trung bình (tất cả review)
    const reviewAgg = await Review.aggregate([
        { $match: { seller: sellerId, deletedAt: { $exists: false } } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const avgRating = reviewAgg[0]?.avg ?? 0;

    // Report rate (Complaint trong 90 ngày / tổng đơn)
    const reportsRecent = await Complaint.countDocuments({
        seller: sellerId,
        createdAt: { $gte: ninetyDaysAgo },
    });
    const reportRate = totalOrdersRecent > 0
        ? (reportsRecent / totalOrdersRecent) * 100
        : 0;

    return { successOrders, avgRating, refundRate, reportRate };
}

// ─── Kiểm tra và cập nhật stage cho một seller ────────────────────────────────
async function checkAndUpdateSellerStage(seller) {
    const metrics = await computeSellerMetrics(seller._id);

    const accountAgeDays = seller.sellerInfo?.registeredAt
        ? (Date.now() - new Date(seller.sellerInfo.registeredAt).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

    const currentStage = seller.sellerStage;
    let newStage = currentStage;
    let reason = "";

    if (currentStage === "PROBATION") {
        // Điều kiện nâng cấp lên NORMAL
        const canUpgrade =
            metrics.successOrders >= 20 &&
            metrics.avgRating >= 4.5 &&
            metrics.refundRate < 5 &&
            accountAgeDays >= 30 &&
            seller.violationCount === 0;

        if (canUpgrade) {
            newStage = "NORMAL";
            reason = `Nâng cấp tự động: ${metrics.successOrders} đơn thành công, rating ${metrics.avgRating.toFixed(1)}⭐, refund rate ${metrics.refundRate.toFixed(1)}%`;
        }
    } else if (currentStage === "NORMAL") {
        // Điều kiện hạ cấp về PROBATION
        if (metrics.avgRating < 3.5) {
            newStage = "PROBATION";
            reason = `Rating trung bình thấp: ${metrics.avgRating.toFixed(1)} (yêu cầu ≥ 3.5)`;
        } else if (metrics.refundRate > 10) {
            newStage = "PROBATION";
            reason = `Tỷ lệ hoàn trả cao: ${metrics.refundRate.toFixed(1)}% (yêu cầu < 10%)`;
        } else if (metrics.reportRate > 5) {
            newStage = "PROBATION";
            reason = `Tỷ lệ khiếu nại cao: ${metrics.reportRate.toFixed(1)}% (yêu cầu < 5%)`;
        }
    }

    // Cập nhật metrics dù có thay đổi stage hay không
    const updateData = {
        "sellerInfo.successOrders": metrics.successOrders,
        "sellerInfo.avgRating": Math.round(metrics.avgRating * 100) / 100,
        "sellerInfo.refundRate": Math.round(metrics.refundRate * 100) / 100,
        "sellerInfo.reportRate": Math.round(metrics.reportRate * 100) / 100,
    };

    if (newStage !== currentStage) {
        updateData.sellerStage = newStage;
        updateData["sellerInfo.lastStageChangedAt"] = new Date();

        console.log(`[SellerStage] ${seller.username}: ${currentStage} → ${newStage} | ${reason}`);

        // Gửi notification cho seller
        try {
            await notificationService.sendNotification({
                recipientId: seller._id,
                type: newStage === "NORMAL" ? "seller_upgraded" : "seller_downgraded",
                title: newStage === "NORMAL"
                    ? "🎉 Tài khoản Seller đã được nâng cấp lên NORMAL"
                    : "⚠️ Tài khoản Seller bị hạ cấp về PROBATION",
                body: reason,
                link: "/seller",
                metadata: { oldStage: currentStage, newStage, reason },
            });
        } catch (e) {
            console.error("[SellerStage] Gửi notification thất bại:", e.message);
        }
    }

    await User.findByIdAndUpdate(seller._id, updateData);

    return { changed: newStage !== currentStage, oldStage: currentStage, newStage, metrics };
}

// ─── Chạy cho toàn bộ sellers (dùng bởi cron job) ─────────────────────────────
async function runStageCheckForAllSellers() {
    console.log("[SellerStage] Bắt đầu kiểm tra stage cho tất cả sellers...");

    const sellers = await User.find({ role: "seller", status: "active" })
        .select("_id username sellerStage sellerInfo violationCount")
        .lean();

    let upgraded = 0, downgraded = 0, unchanged = 0;

    for (const seller of sellers) {
        try {
            const result = await checkAndUpdateSellerStage(seller);
            if (result.changed) {
                if (result.newStage === "NORMAL") upgraded++;
                else downgraded++;
            } else unchanged++;
        } catch (err) {
            console.error(`[SellerStage] Lỗi khi xử lý seller ${seller._id}:`, err.message);
        }
    }

    console.log(`[SellerStage] Hoàn tất: ${upgraded} nâng cấp, ${downgraded} hạ cấp, ${unchanged} không thay đổi`);
    return { upgraded, downgraded, unchanged, total: sellers.length };
}

module.exports = { checkAndUpdateSellerStage, runStageCheckForAllSellers, computeSellerMetrics };
