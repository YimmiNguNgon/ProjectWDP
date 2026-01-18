const express = require("express");
const userController = require("../controller/userController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

// Get current user info
router.get("/me", protectedRoute, userController.authMe);

// Profile management
router.get("/profile", protectedRoute, userController.getUserProfile);
router.put("/profile", protectedRoute, userController.updateUserProfile);

// Address management
router.post("/addresses", protectedRoute, userController.addUserAddress);
router.put("/addresses/:addressId", protectedRoute, userController.updateUserAddress);
router.delete("/addresses/:addressId", protectedRoute, userController.deleteUserAddress);
router.post("/addresses/:addressId/set-default", protectedRoute, userController.setDefaultAddress);

// Premium upgrade
router.post("/upgrade-premium", protectedRoute, userController.upgradeToPremium);

module.exports = router;
