/**
 * verifiedBadgeJob.js
 * Cron job chạy hàng ngày lúc 3:00 AM để kiểm tra và cập nhật Verified Seller Badge.
 */

const cron = require("node-cron");
const { runVerifiedBadgeCheckForAllSellers } = require("../services/verifiedBadgeService");

function initVerifiedBadgeJob() {
    // 3:00 AM mỗi ngày
    cron.schedule("0 3 * * *", async () => {
        console.log("[Cron] Bắt đầu kiểm tra Verified Seller Badge...");
        try {
            const result = await runVerifiedBadgeCheckForAllSellers();
            console.log("[Cron] Verified Badge check hoàn tất:", result);
        } catch (err) {
            console.error("[Cron] Lỗi Verified Badge job:", err.message);
        }
    });

    console.log("✅ Verified Badge cron job đã được khởi tạo (chạy hàng ngày lúc 3:00 AM)");
}

module.exports = { initVerifiedBadgeJob };
