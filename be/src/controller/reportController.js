/**
 * reportController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handlers for the Buyer Report System API.
 */

const mongoose = require("mongoose");
const reportService = require("../services/reportService");
const Report = require("../models/Report");
const BuyerReportStats = require("../models/BuyerReportStats");

// ── POST /api/reports ─────────────────────────────────────────────────────────
/**
 * Buyer submits a new report.
 * Body: { sellerId, productId?, orderId?, reason, description, evidenceUrl? }
 */
exports.submitReport = async (req, res, next) => {
  try {
    const buyerId = req.user._id;
    const { sellerId, productId, orderId, reason, description, evidenceUrl, deviceFingerprint } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    if (!sellerId || !reason || !description) {
      return res.status(400).json({ message: "sellerId, reason, and description are required" });
    }

    const VALID_REASONS = [
      "FAKE_PRODUCT",
      "WRONG_DESCRIPTION",
      "SCAM_OR_FRAUD",
      "POOR_QUALITY",
      "SPAM_OR_PROHIBITED",
    ];
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ message: `reason must be one of: ${VALID_REASONS.join(", ")}` });
    }

    if (!mongoose.isValidObjectId(sellerId)) {
      return res.status(400).json({ message: "Invalid sellerId" });
    }

    const report = await reportService.submitReport({
      buyerId,
      sellerId,
      productId: productId || null,
      orderId: orderId || null,
      reason,
      description,
      evidenceUrl: evidenceUrl || null,
      ipAddress,
      deviceFingerprint: deviceFingerprint || null,
    });

    return res.status(201).json({ message: "Report submitted successfully", data: report });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
};

// ── GET /api/reports/my ───────────────────────────────────────────────────────
/**
 * Buyer views their own submitted reports.
 */
exports.getMyReports = async (req, res, next) => {
  try {
    const buyerId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const filter = { buyer: buyerId };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const result = await reportService.getReports({ filter, page, limit });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/reports/my-stats ─────────────────────────────────────────────────
/**
 * Buyer views their report accuracy stats.
 */
exports.getMyStats = async (req, res, next) => {
  try {
    const stats = await reportService.getBuyerStats(req.user._id);
    return res.json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/reports (admin) ──────────────────────────────────────────────────
/**
 * Admin lists all reports with optional filters.
 * Query params: status, sellerId, buyerId, page, limit
 */
exports.getAllReports = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.sellerId && mongoose.isValidObjectId(req.query.sellerId)) {
      filter.seller = req.query.sellerId;
    }
    if (req.query.buyerId && mongoose.isValidObjectId(req.query.buyerId)) {
      filter.buyer = req.query.buyerId;
    }

    const result = await reportService.getReports({ filter, page, limit });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/reports/:id (admin) ──────────────────────────────────────────────
exports.getReportById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid report id" });
    }
    const report = await Report.findById(req.params.id)
      .populate("buyer", "username email avatarUrl")
      .populate("seller", "username email sellerInfo")
      .populate("product", "title images")
      .populate("order", "totalPrice status createdAt")
      .populate("verifiedBy", "username")
      .lean();

    if (!report) return res.status(404).json({ message: "Report not found" });
    return res.json({ data: report });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/reports/:id/verify (admin) ────────────────────────────────────
/**
 * Admin verifies a report as VALID or REJECTED.
 * Body: { status: "VALID" | "REJECTED", adminNote? }
 */
exports.verifyReport = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid report id" });
    }

    const report = await reportService.verifyReport({
      reportId: req.params.id,
      status,
      adminId: req.user._id,
      adminNote,
    });

    return res.json({ message: `Report marked as ${status}`, data: report });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
};

// ── GET /api/reports/buyer-stats (admin) ─────────────────────────────────────
/**
 * Admin views all buyer reporting stats (sorted by lowest accuracy first).
 */
exports.getAllBuyerStats = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.underMonitoring === "true") filter.underMonitoring = true;

    const [stats, total] = await Promise.all([
      BuyerReportStats.find(filter)
        .populate("buyer", "username email avatarUrl status")
        .sort({ accuracyScore: 1, totalReports: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BuyerReportStats.countDocuments(filter),
    ]);

    return res.json({ stats, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/reports/buyer-stats/:buyerId/clear-monitoring (admin) ───────────
/**
 * Admin manually clears a buyer's monitoring mode.
 */
exports.clearBuyerMonitoring = async (req, res, next) => {
  try {
    const { buyerId } = req.params;
    if (!mongoose.isValidObjectId(buyerId)) {
      return res.status(400).json({ message: "Invalid buyerId" });
    }
    const stats = await BuyerReportStats.findOneAndUpdate(
      { buyer: buyerId },
      { $set: { underMonitoring: false, monitoringStartedAt: null } },
      { new: true }
    );
    if (!stats) return res.status(404).json({ message: "Buyer stats not found" });
    return res.json({ message: "Monitoring mode cleared", data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = exports;
