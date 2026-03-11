const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const reportController = require("../controller/reportController");

// ── Role guards ───────────────────────────────────────────────────────────────
const isBuyer = (req, res, next) => {
  if (!req.user || !["buyer", "seller"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: Buyer or Seller only" });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin only" });
  }
  next();
};

// ── Buyer routes ──────────────────────────────────────────────────────────────
// POST /api/reports           – submit a report
router.post("/", protectedRoute, isBuyer, reportController.submitReport);

// GET /api/reports/my         – buyer's own reports
router.get("/my", protectedRoute, isBuyer, reportController.getMyReports);

// GET /api/reports/my-stats   – buyer's accuracy stats
router.get("/my-stats", protectedRoute, isBuyer, reportController.getMyStats);

// ── Admin routes ──────────────────────────────────────────────────────────────
// GET /api/reports                           – list all reports
router.get("/", protectedRoute, isAdmin, reportController.getAllReports);

// GET /api/reports/buyer-stats               – all buyer stats (abuse detection)
router.get("/buyer-stats", protectedRoute, isAdmin, reportController.getAllBuyerStats);

// POST /api/reports/buyer-stats/:buyerId/clear-monitoring
router.post(
  "/buyer-stats/:buyerId/clear-monitoring",
  protectedRoute,
  isAdmin,
  reportController.clearBuyerMonitoring
);

// GET /api/reports/:id        – single report detail
router.get("/:id", protectedRoute, isAdmin, reportController.getReportById);

// PATCH /api/reports/:id/verify – verify VALID or REJECTED
router.patch("/:id/verify", protectedRoute, isAdmin, reportController.verifyReport);

module.exports = router;
