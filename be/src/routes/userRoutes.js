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

// Public routes
router.get("/", orderController.getOrders); // Với query params
router.get("/all", orderController.getAllOrders); // Tất cả không phân trang
router.get("/stats", orderController.getOrderStats); // Thống kê

// Order detail
router.get("/:id", orderController.getOrderById);

module.exports = router;
