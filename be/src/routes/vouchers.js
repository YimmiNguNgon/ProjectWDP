const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const { withAuditLog } = require("../middleware/auditLogMiddleware");
const voucherController = require("../controller/voucherController");
const Voucher = require("../models/Voucher");
const VoucherRequest = require("../models/VoucherRequest");

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
router.get("/available", protectedRoute, voucherController.getAvailableVouchers);
router.post("/claim", protectedRoute, voucherController.claimVoucher);
router.get("/my-wallet", protectedRoute, voucherController.getMyVoucherWallet);
router.get("/health", (req, res) => {
  return res.json({ ok: true, module: "vouchers" });
});

router.post(
  "/requests",
  protectedRoute,
  sellerOnly,
  withAuditLog({
    resourceType: "voucher_request",
    model: VoucherRequest,
    actorRoles: ["seller"],
    action: "create",
  }),
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
  withAuditLog({
    resourceType: "voucher_request",
    model: VoucherRequest,
    resourceIdParam: "id",
    actorRoles: ["seller"],
    action: "delete",
  }),
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
  withAuditLog({
    resourceType: "voucher",
    model: Voucher,
    resourceIdParam: "id",
    actorRoles: ["seller"],
    action: "status_change",
  }),
  voucherController.setMyVoucherStatus,
);

router.get(
  "/admin/requests",
  protectedRoute,
  adminOnly,
  voucherController.getAdminVoucherRequests,
);
router.post(
  "/admin/global",
  protectedRoute,
  adminOnly,
  withAuditLog({
    resourceType: "voucher",
    model: Voucher,
    actorRoles: ["admin"],
    action: "create",
  }),
  voucherController.createAdminGlobalVoucher,
);
router.get(
  "/admin/global",
  protectedRoute,
  adminOnly,
  voucherController.getAdminGlobalVouchers,
);
router.patch(
  "/admin/global/:id/status",
  protectedRoute,
  adminOnly,
  withAuditLog({
    resourceType: "voucher",
    model: Voucher,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "status_change",
  }),
  voucherController.setAdminGlobalVoucherStatus,
);
router.post(
  "/admin/requests/:id/approve",
  protectedRoute,
  adminOnly,
  withAuditLog({
    resourceType: "voucher_request",
    model: VoucherRequest,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "approve",
  }),
  voucherController.approveVoucherRequest,
);
router.post(
  "/admin/requests/:id/reject",
  protectedRoute,
  adminOnly,
  withAuditLog({
    resourceType: "voucher_request",
    model: VoucherRequest,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "reject",
  }),
  voucherController.rejectVoucherRequest,
);

module.exports = router;
