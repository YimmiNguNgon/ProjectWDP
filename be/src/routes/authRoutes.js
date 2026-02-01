const express = require("express");
const passport = require("passport");
const authController = require("../controller/authController.js");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logOut);
router.post("/refresh", authController.refreshToken);
router.post("/verify-email", authController.verifyEmail);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-email", authController.resendVerificationEmail);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.CLIENT_URL + "/login?error=google_auth_failed",
  }),
  authController.googleCallback,
);

module.exports = router;
