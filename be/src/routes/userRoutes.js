const express = require("express");
const userController = require("../controller/userController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/me", protectedRoute, userController.authMe);

module.exports = router;
