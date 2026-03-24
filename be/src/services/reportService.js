/**
 * reportService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic for the Buyer Report System.
 *
 * Key rules:
 *  1. Rate-limit: max 3 reports per buyer within 7 days.
 *  2. Abuse detection: accuracyScore = validReports / totalReports.
 *     If accuracyScore < 0.3 (after ≥5 total reports), buyer enters monitoring mode.
 *  3. Only VALID reports affect seller metrics (totalComplaints → DisputeScore).
 *  4. If a seller accumulates ≥3 VALID reports in 30 days OR validReportRate > 10%,
 *     their riskFlagged is set to TRUE → productModerationMode = REQUIRE_ADMIN.
 */

const Report = require("../models/Report");
const BuyerReportStats = require("../models/BuyerReportStats");
const SellerTrustScore = require("../models/SellerTrustScore");
const SellerRiskHistory = require("../models/SellerRiskHistory");
const Order = require("../models/Order");
const User = require("../models/User");
const notificationService = require("./notificationService");
const { evaluateSellerTrust } = require("./sellerTrustService");
const antiAbuseService = require("./reportAntiAbuseService");

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_REPORTS_PER_7_DAYS = 3;
const ACCURACY_THRESHOLD = 0.3;      // below this → monitoring
const MIN_REPORTS_FOR_ACCURACY = 5;  // need at least 5 reports before enforcing
const VALID_REPORTS_30D_THRESHOLD = 3;
const VALID_REPORT_RATE_THRESHOLD = 0.10;

// ── Submit a new report ───────────────────────────────────────────────────────

/**
 * submitReport – validates rate limits / abuse rules, then saves the report.
 * Returns the saved report document.
 */
async function submitReport({ buyerId, sellerId, productId, orderId, reason, description, evidenceUrl, ipAddress, deviceFingerprint }) {
  // Validate with anti-abuse layer
  await antiAbuseService.validateReportSubmission(buyerId, sellerId, ipAddress, deviceFingerprint);

  // 1. Load buyer stats
  let stats = await BuyerReportStats.findOne({ buyer: buyerId });
  if (!stats) {
    stats = await BuyerReportStats.create({ buyer: buyerId });
  }

  // 2. Check monitoring mode
  if (stats.underMonitoring) {
    const err = new Error("Your account is in report monitoring mode. You cannot submit new reports at this time.");
    err.statusCode = 403;
    throw err;
  }

  // 3. Check 7-day rate limit
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentCount = await Report.countDocuments({
    buyer: buyerId,
    createdAt: { $gte: sevenDaysAgo },
  });
  if (recentCount >= MAX_REPORTS_PER_7_DAYS) {
    const err = new Error(`You have reached the report limit (${MAX_REPORTS_PER_7_DAYS} reports per 7 days).`);
    err.statusCode = 429;
    throw err;
  }

  // Calculate weight based on user trust
  const buyerDoc = await User.findById(buyerId).lean();
  const weight = antiAbuseService.calculateReportWeight(buyerDoc, stats);

  // 4. Save the report with PENDING status
  const report = await Report.create({
    buyer: buyerId,
    seller: sellerId,
    product: productId || null,
    order: orderId || null,
    reason,
    description,
    evidenceUrl: evidenceUrl || null,
    status: "PENDING",
    weight,
    ipAddress: ipAddress || null,
    deviceFingerprint: deviceFingerprint || null
  });

  // 5. Increment buyer stats
  stats.totalReports += 1;
  stats.lastReportAt = new Date();
  
  // Update accuracy based on evaluated reports ONLY
  const totalEvaluated = (stats.validReports || 0) + (stats.rejectedReports || 0);
  stats.accuracyScore = totalEvaluated > 0 ? stats.validReports / totalEvaluated : 1.0;
  
  await stats.save();

  return report;
}

// ── Verify a report (admin action) ───────────────────────────────────────────

/**
 * verifyReport – admin marks a report as VALID or REJECTED.
 * Only VALID status triggers seller side-effects.
 */
async function verifyReport({ reportId, status, adminId, adminNote }) {
  const report = await Report.findById(reportId);
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }
  if (report.status !== "PENDING") {
    const err = new Error("Only PENDING reports can be verified");
    err.statusCode = 400;
    throw err;
  }
  if (!["VALID", "REJECTED"].includes(status)) {
    const err = new Error("Status must be VALID or REJECTED");
    err.statusCode = 400;
    throw err;
  }

  // Update the report
  report.status = status;
  report.verifiedBy = adminId;
  report.verifiedAt = new Date();
  report.adminNote = adminNote || null;
  await report.save();

  // Update buyer accuracy stats
  await updateBuyerStats(report.buyer, status);

  if (status === "VALID") {
    // Trigger seller-side effects
    await handleValidReport(report);
  }

  return report;
}

// ── Update buyer accuracy stats ───────────────────────────────────────────────

async function updateBuyerStats(buyerId, status) {
  const stats = await BuyerReportStats.findOne({ buyer: buyerId });
  if (!stats) return;

  if (status === "VALID") {
    stats.validReports += 1;
  } else if (status === "REJECTED") {
    stats.rejectedReports += 1;
  }

  // Recalculate accuracy score
  const totalEvaluated = stats.validReports + stats.rejectedReports;
  stats.accuracyScore = totalEvaluated > 0
    ? stats.validReports / totalEvaluated
    : 1.0;

  // Enter monitoring mode if accuracy is too low (after minimum threshold)
  if (totalEvaluated >= MIN_REPORTS_FOR_ACCURACY && stats.accuracyScore < ACCURACY_THRESHOLD) {
    if (!stats.underMonitoring) {
      stats.underMonitoring = true;
      stats.monitoringStartedAt = new Date();
      // Notify buyer
      try {
        await notificationService.sendNotification({
          recipientId: buyerId,
          type: "report_monitoring_mode",
          title: "⚠️ Report Monitoring Mode Activated",
          body: `Your report accuracy score (${(stats.accuracyScore * 100).toFixed(0)}%) is below the minimum threshold. You cannot submit new reports temporarily.`,
          link: "/my-ebay/activity/purchases",
          metadata: { accuracyScore: stats.accuracyScore },
        });
      } catch (e) {
        console.error("[ReportService] Failed to notify buyer monitoring mode:", e.message);
      }
    }
  }

  await stats.save();
}

// ── Handle side-effects when a report is VALID ────────────────────────────────

async function handleValidReport(report) {
  const sellerId = report.seller;

  // Re-evaluate seller trust score (report is now factored via Report model)
  try {
    await evaluateSellerTrust(sellerId, "REPORT_VERIFIED");
  } catch (e) {
    console.error("[ReportService] Trust score recalc failed:", e.message);
  }

  // Check seller risk thresholds in 30-day window
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReports = await Report.find({
    seller: sellerId,
    verifiedAt: { $gte: thirtyDaysAgo },
  }).populate("buyer", "createdAt").lean();

  if (antiAbuseService.detectSuspiciousPattern(recentReports)) {
    // If a cluster/spam event detected, do not penalize seller
    // Mark them dynamically as suspicious cluster
    await Report.updateMany(
      { _id: { $in: recentReports.map(r => r._id) } },
      { $set: { suspiciousCluster: true } }
    );
    // Exit early, prevent automatic penalization
    return;
  }

  // Weighted valid issues in last 30 days
  const validReports30DaysCount = recentReports.filter(r => r.status === "VALID").length;
  const weightedRiskScore = antiAbuseService.calculateSellerRiskScore(recentReports);

  const totalOrders = await Order.countDocuments({ seller: sellerId });
  const validReportRate = totalOrders > 0 ? weightedRiskScore / totalOrders : 0;

  const shouldFlag =
    antiAbuseService.shouldFlagSeller(recentReports) ||
    validReportRate > VALID_REPORT_RATE_THRESHOLD;

  if (shouldFlag) {
    const trustDoc = await SellerTrustScore.findOne({ seller: sellerId });
    const wasAlreadyWarned = trustDoc?.reportWarningSent ?? false;

    if (!wasAlreadyWarned) {
      // Send Warning Only
      await SellerTrustScore.findOneAndUpdate(
        { seller: sellerId },
        {
          $set: {
            reportWarningSent: true,
          },
        },
        { upsert: true }
      );

      // Log in SellerRiskHistory
      const riskReason =
        validReports30DaysCount >= VALID_REPORTS_30D_THRESHOLD
          ? `≥${VALID_REPORTS_30D_THRESHOLD} valid reports in 30 days (count: ${validReports30DaysCount}, total weighted score: ${weightedRiskScore})`
          : `Weighted valid report rate ${(validReportRate * 100).toFixed(1)}% exceeds ${VALID_REPORT_RATE_THRESHOLD * 100}% threshold`;

      await SellerRiskHistory.create({
        seller: sellerId,
        action: "WARNING_SENT",
        riskFlagged: trustDoc?.riskFlagged ?? false,
        metrics: {
          totalOrders30Days: totalOrders,
          disputeCount30Days: validReports30DaysCount,
          adjustedRefundRate: 0,
          disputeRate: validReportRate,
          finalScore: trustDoc?.finalScore ?? 0,
        },
        reason: riskReason,
        triggeredBy: "REPORT_VERIFIED",
      });

      // Notify seller
      try {
        await notificationService.sendNotification({
          recipientId: sellerId,
          type: "seller_report_warning",
          title: "⚠️ Warning: Multiple Valid Reports",
          body: `Your account has received multiple valid buyer reports recently. Please review your behavior to avoid further penalties.`,
          link: "/seller/trust-score",
          metadata: { validReports30DaysCount, validReportRate },
        });
      } catch (e) {
        console.error("[ReportService] Failed to notify seller report warning:", e.message);
      }
    }
  }

  // Notify seller about valid report
  try {
    await notificationService.sendNotification({
      recipientId: sellerId,
      type: "report_valid",
      title: "📋 A buyer report has been verified",
      body: `A report against you has been reviewed and marked as valid (Reason: ${report.reason.replace(/_/g, " ")}). This may affect your trust score.`,
      link: "/seller/trust-score",
      metadata: { reportId: report._id, reason: report.reason },
    });
  } catch (e) {
    console.error("[ReportService] Failed to notify seller:", e.message);
  }
}

// ── Get reports (paginated) ────────────────────────────────────────────────────

async function getReports({ filter = {}, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate("buyer", "username email avatarUrl")
      .populate("seller", "username email sellerInfo")
      .populate("product", "title images")
      .populate("order", "totalPrice status createdAt")
      .populate("verifiedBy", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { reports, total, page, pages: Math.ceil(total / limit) };
}

async function getBuyerStats(buyerId) {
  let stats = await BuyerReportStats.findOne({ buyer: buyerId }).lean();
  if (!stats) {
    stats = {
      totalReports: 0,
      validReports: 0,
      rejectedReports: 0,
      accuracyScore: 1.0,
      underMonitoring: false,
      lastReportAt: null,
    };
  }
  return stats;
}

module.exports = {
  submitReport,
  verifyReport,
  getReports,
  getBuyerStats,
  updateBuyerStats,
};
