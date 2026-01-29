const express = require("express");
const router = express.Router();
const orderController = require("../controller/orderController");
const userController = require("../controller/userController");
const { protectedRoute } = require("../middleware/authMiddleware");

// user routes
router.get("/me", protectedRoute, userController.authMe);
router.put(
  "/update-user-profile",
  protectedRoute,
  userController.updateProfile,
);
router.put("/update-user-email", protectedRoute, userController.updateEmail);
router.put("/change-password", protectedRoute, userController.changePassword);

// Saved sellers routes
router.post(
  "/saved-sellers/:sellerId",
  protectedRoute,
  userController.saveSeller,
);
router.delete(
  "/saved-sellers/:sellerId",
  protectedRoute,
  userController.unsaveSeller,
);
router.get("/saved-sellers", protectedRoute, userController.getSavedSellers);

// Hidden orders routes
router.post(
  "/hidden-orders/:orderId",
  protectedRoute,
  userController.hideOrder,
);
router.delete(
  "/hidden-orders/:orderId",
  protectedRoute,
  userController.unhideOrder,
);

// Public routes
router.get("/", orderController.getOrders); // Với query params
router.get("/all", orderController.getAllOrders); // Tất cả không phân trang
router.get("/stats", orderController.getOrderStats); // Thống kê

// Order detail
router.get("/:id", orderController.getOrderById);

module.exports = router;
