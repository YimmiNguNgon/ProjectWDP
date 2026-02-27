const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const voucherController = require("../controller/voucherController");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

const sellerOnly = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Seller access required",
    });
  }
  next();
};

router.post("/validate", protectedRoute, voucherController.validateVoucher);
router.get("/health", (req, res) => {
  return res.json({ ok: true, module: "vouchers" });
});

router.post(
  "/requests",
  protectedRoute,
  sellerOnly,
  voucherController.requestVoucher,
);
router.get(
  "/my-requests",
  protectedRoute,
  sellerOnly,
  voucherController.getMyVoucherRequests,
);
router.delete(
  "/requests/:id",
  protectedRoute,
  sellerOnly,
  voucherController.cancelVoucherRequest,
);
router.get(
  "/my-vouchers",
  protectedRoute,
  sellerOnly,
  voucherController.getMyVouchers,
);
router.patch(
  "/my-vouchers/:id/status",
  protectedRoute,
  sellerOnly,
  voucherController.setMyVoucherStatus,
);

router.get(
  "/admin/requests",
  protectedRoute,
  adminOnly,
  voucherController.getAdminVoucherRequests,
);
router.post(
  "/admin/requests/:id/approve",
  protectedRoute,
  adminOnly,
  voucherController.approveVoucherRequest,
);
router.post(
  "/admin/requests/:id/reject",
  protectedRoute,
  adminOnly,
  voucherController.rejectVoucherRequest,
);

module.exports = router;
