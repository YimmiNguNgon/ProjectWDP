/**
 * sellerStageJob.js
 * Cron job chạy hàng ngày lúc 2:00 AM để kiểm tra và cập nhật seller stage.
 */

const cron = require("node-cron");
const { runStageCheckForAllSellers } = require("../services/sellerStageService");

function initSellerStageJob() {
    // Chạy mỗi ngày lúc 2:00 AM
    cron.schedule("0 2 * * *", async () => {
        console.log("[Cron] Bắt đầu kiểm tra Seller Stage...");
        try {
            const result = await runStageCheckForAllSellers();
            console.log("[Cron] Seller Stage check hoàn tất:", result);
        } catch (err) {
            console.error("[Cron] Lỗi Seller Stage job:", err.message);
        }
    });

    console.log("✅ Seller Stage cron job đã được khởi tạo (chạy hàng ngày lúc 2:00 AM)");
}

module.exports = { initSellerStageJob };
