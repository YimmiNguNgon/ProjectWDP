const express = require("express");
const userController = require("../controller/userController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/me", protectedRoute, userController.authMe);
router.put(
  "/update-user-profile",
  protectedRoute,
  userController.updateProfile,
);
router.put("/update-user-email", protectedRoute, userController.updateEmail);
router.put("/change-password", protectedRoute, userController.changePassword);

// Saved sellers routes
router.post("/saved-sellers/:sellerId", protectedRoute, userController.saveSeller);
router.delete("/saved-sellers/:sellerId", protectedRoute, userController.unsaveSeller);
router.get("/saved-sellers", protectedRoute, userController.getSavedSellers);

// Hidden orders routes
router.post("/hidden-orders/:orderId", protectedRoute, userController.hideOrder);
router.delete("/hidden-orders/:orderId", protectedRoute, userController.unhideOrder);

module.exports = router;

