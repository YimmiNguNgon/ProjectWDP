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

module.exports = router;
