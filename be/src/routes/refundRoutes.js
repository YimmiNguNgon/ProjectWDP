const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const { withAuditLog } = require("../middleware/auditLogMiddleware");
const refundController = require("../controller/refundController");
const RefundRequest = require("../models/RefundRequest");

// Midlewares role checker
const checkRole = (role) => (req, res, next) => {
    if (req.user && (req.user.role === role || req.user.role === "admin")) {
        return next();
    }
    return res.status(403).json({ message: `Forbidden: ${role} only` });
};

// Buyer endpoints
router.post("/request", protectedRoute, refundController.requestRefund);
router.post("/:id/dispute", protectedRoute, refundController.disputeRefund);

// Seller endpoints
router.post(
  "/:id/approve",
  protectedRoute,
  checkRole("seller"),
  withAuditLog({
    resourceType: "refund_request",
    model: RefundRequest,
    resourceIdParam: "id",
    actorRoles: ["seller"],
    action: "approve",
  }),
  refundController.approveRefund,
);
router.post(
  "/:id/reject",
  protectedRoute,
  checkRole("seller"),
  withAuditLog({
    resourceType: "refund_request",
    model: RefundRequest,
    resourceIdParam: "id",
    actorRoles: ["seller"],
    action: "reject",
  }),
  refundController.rejectRefund,
);

router.post(
  "/:id/confirm-receipt",
  protectedRoute,
  checkRole("seller"),
  withAuditLog({
    resourceType: "refund_request",
    model: RefundRequest,
    resourceIdParam: "id",
    actorRoles: ["seller"],
    action: "confirm_return_receipt",
  }),
  refundController.confirmReturnReceived,
);

// Admin endpoints
router.post(
  "/:id/admin-review",
  protectedRoute,
  checkRole("admin"),
  withAuditLog({
    resourceType: "refund_request",
    model: RefundRequest,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "review",
  }),
  refundController.adminReviewRefund,
);

// Endpoints to fetch data
router.get("/order/:orderId", protectedRoute, refundController.getRefundByOrder);
router.get("/buyer", protectedRoute, refundController.getBuyerRefunds);
router.get("/seller", protectedRoute, checkRole("seller"), refundController.getSellerRefunds);
router.get("/admin", protectedRoute, checkRole("admin"), refundController.getAdminRefunds);

module.exports = router;

