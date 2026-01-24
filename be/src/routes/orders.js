const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/orderController");
const sellerCtrl = require("../controller/sellerOrderController");
const shippingCtrl = require("../controller/shippingController");

// Order creation and viewing
router.post("/", protectedRoute, ctrl.createOrder); // create order (buyer)
router.get("/:id", protectedRoute, ctrl.getOrder);
router.get("/", protectedRoute, ctrl.listOrdersForUser); // ?userId or auth user

// Seller order management
router.patch("/:id/status", protectedRoute, sellerCtrl.updateOrderStatus);
router.patch("/:id/tracking", protectedRoute, sellerCtrl.addTrackingNumber);
router.patch("/:id/shipping-address", protectedRoute, sellerCtrl.updateShippingAddress);
router.get("/:id/history", protectedRoute, sellerCtrl.getStatusHistory);

// Shipping label
router.post("/:id/shipping-label", protectedRoute, shippingCtrl.generateShippingLabel);

module.exports = router;
