const cron = require("node-cron");
const { autoEscalateComplaints } = require("../services/complaintService");

function initComplaintJob() {
  // Chạy job lúc 1h sáng mỗi ngày
  cron.schedule("0 1 * * *", async () => {
    try {
      const { escalatedCount } = await autoEscalateComplaints();
      if (escalatedCount > 0) {
        console.log(`[Job:Complaint] Đã tự động gửi ${escalatedCount} complaints quá 48h lên admin.`);
      }
    } catch (error) {
      console.error("[Job:Complaint] Error auto-escalating:", error);
    }
  });
  console.log("✅ Complaint auto-escalate cron job initialized");
}

module.exports = { initComplaintJob };
