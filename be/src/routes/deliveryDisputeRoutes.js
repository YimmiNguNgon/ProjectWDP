const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/deliveryDisputeController");

const isShipper = (req, res, next) => {
  if (req.user?.role !== "shipper") return res.status(403).json({ message: "Forbidden" });
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
};

// Buyer routes
router.post("/order/:orderId/confirm-received",    protectedRoute, ctrl.confirmReceived);
router.post("/order/:orderId/report-not-received", protectedRoute, ctrl.reportNotReceived);
router.get("/order/:orderId",                       protectedRoute, ctrl.getDisputeByOrder);
router.patch("/:id/confirm",                        protectedRoute, ctrl.buyerConfirmAfterDispute);
router.patch("/:id/report-to-admin",               protectedRoute, ctrl.buyerReportToAdmin);

// Shipper routes
router.get("/shipper/list",   protectedRoute, isShipper, ctrl.getShipperDisputes);
router.patch("/:id/respond",  protectedRoute, isShipper, ctrl.shipperRespond);

// Admin routes
router.get("/admin/list",            protectedRoute, isAdmin, ctrl.adminGetDisputes);
router.patch("/:id/admin-notify",    protectedRoute, isAdmin, ctrl.adminNotifyBuyer);

module.exports = router;
