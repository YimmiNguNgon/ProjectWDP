const cron = require("node-cron");
const { runAutoApproveRefunds } = require("../services/refundService");

function initRefundJob() {
    // Chạy mỗi giờ một lần
    cron.schedule("0 * * * *", async () => {
        try {
            const res = await runAutoApproveRefunds();
            if (res.approvedCount > 0) {
                console.log(`[Refund Job] Đã auto-approve ${res.approvedCount} đơn.`);
            }
        } catch (err) {
            console.error("[Refund Job] Lỗi chạy tiến trình auto-approve refund:", err);
        }
    });

    console.log("✅ Refund chron job đã được khởi tạo (chạy mỗi giờ)");
}

module.exports = { initRefundJob };
