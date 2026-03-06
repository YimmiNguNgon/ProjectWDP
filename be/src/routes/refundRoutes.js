const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const { withAuditLog } = require("../middleware/auditLogMiddleware");
const refundController = require("../controller/refundController");
const RefundRequest = require("../models/RefundRequest");

// Midlewares role checker
const checkRole = (role) => (req, res, next) => {
    if (req.user && req.user.role === role) {
        return next();
    }
    return res.status(403).json({ message: `Forbidden: ${role} only` });
};

// Buyer endpoints
router.post("/request", protectedRoute, checkRole("buyer"), refundController.requestRefund);
router.post("/:id/dispute", protectedRoute, checkRole("buyer"), refundController.disputeRefund);

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
router.get("/buyer", protectedRoute, checkRole("buyer"), refundController.getBuyerRefunds);
router.get("/seller", protectedRoute, checkRole("seller"), refundController.getSellerRefunds);

module.exports = router;

