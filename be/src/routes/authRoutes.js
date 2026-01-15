const express = require("express");
const authController = require("../controller/authController.js");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logOut);
router.post("/refresh", authController.refreshToken);
router.post("/verify-email", authController.verifyEmail);

module.exports = router;
