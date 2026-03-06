const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const { withAuditLog } = require("../middleware/auditLogMiddleware");
const orderController = require("../controller/orderController");
const sellerOrderController = require("../controller/sellerOrderController");
const Order = require("../models/Order");

router.post("/checkout/preview", protectedRoute, orderController.previewCheckout);
router.post("/checkout/confirm", protectedRoute, orderController.confirmCheckout);
router.post("/", protectedRoute, orderController.createOrder);
router.patch(
  "/:id/status",
  protectedRoute,
  withAuditLog({
    resourceType: "order",
    model: Order,
    resourceIdParam: "id",
    actorRoles: ["seller", "admin"],
    action: "status_change",
  }),
  sellerOrderController.updateOrderStatus,
);
router.patch(
  "/:id/tracking",
  protectedRoute,
  withAuditLog({
    resourceType: "order",
    model: Order,
    resourceIdParam: "id",
    actorRoles: ["seller", "admin"],
    action: "update",
  }),
  sellerOrderController.addTrackingNumber,
);
router.get("/:id/history", protectedRoute, sellerOrderController.getStatusHistory);
router.patch(
  "/:id/shipping-address",
  protectedRoute,
  withAuditLog({
    resourceType: "order",
    model: Order,
    resourceIdParam: "id",
    actorRoles: ["seller", "admin"],
    action: "update",
  }),
  sellerOrderController.updateShippingAddress,
);
router.get('/all', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);
router.get('/', protectedRoute, orderController.getOrders);

module.exports = router;
