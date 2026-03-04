/**
 * sellerStageJob.js
 * Cron job chạy hàng ngày để:
 * - 2:00 AM: Kiểm tra và cập nhật seller stage
 * - 2:30 AM: Tính lại Trust Score cho toàn bộ sellers
 */

const cron = require("node-cron");
const { runStageCheckForAllSellers } = require("../services/sellerStageService");
const { runTrustScoreForAllSellers } = require("../services/sellerTrustService");

function initSellerStageJob() {
    // 2:00 AM – Seller Stage check
    cron.schedule("0 2 * * *", async () => {
        console.log("[Cron] Bắt đầu kiểm tra Seller Stage...");
        try {
            const result = await runStageCheckForAllSellers();
            console.log("[Cron] Seller Stage check hoàn tất:", result);
        } catch (err) {
            console.error("[Cron] Lỗi Seller Stage job:", err.message);
        }
    });

    // 2:30 AM – Trust Score recalculation
    cron.schedule("30 2 * * *", async () => {
        console.log("[Cron] Bắt đầu tính Trust Score cho toàn bộ sellers...");
        try {
            const result = await runTrustScoreForAllSellers();
            console.log("[Cron] Trust Score hoàn tất:", result);
        } catch (err) {
            console.error("[Cron] Lỗi Trust Score job:", err.message);
        }
    });

    console.log("✅ Seller Stage cron job đã được khởi tạo (chạy hàng ngày lúc 2:00 AM)");
    console.log("✅ Trust Score cron job đã được khởi tạo (chạy hàng ngày lúc 2:30 AM)");
}

module.exports = { initSellerStageJob };
