const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User.js");
const Session = require("../models/Session.js");
const sendEmail = require("../utils/sendEmail.js");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // tạo token xác thực email
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const newUser = new User({
      username,
      email,
      passwordHash: hashPassword,
      role: role || "buyer",
      isEmailVerified: false, // Tạm thời set true cho môi trường dev
      emailVerificationToken: hashedToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    await newUser.save();

    // Gửi email xác thực (optional - sẽ bỏ qua nếu không có email config)
    try {
      const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

      await sendEmail({
        to: email,
        subject: "Xác thực tài khoản của bạn",
        template: "verifyEmail.ejs",
        data: {
          username,
          verifyUrl,
          expiresIn: 24,
        },
      });
    } catch (emailError) {
      console.log("Email sending failed (skipped in dev):", emailError.message);
    }

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    console.log("=== LOGIN REQUEST START ===");
    console.log("Login request body:", req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Missing fields - username:", username, "password:", password ? "exists" : "missing");
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    console.log("Finding user with username:", username);
    const user = await User.findOne({ username });

    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    console.log("User found:", {
      id: user._id,
      username: user.username,
      hasPasswordHash: !!user.passwordHash,
      passwordHash: user.passwordHash ? "exists" : "MISSING"
    });

    // Kiểm tra xem user có passwordHash không
    if (!user.passwordHash) {
      console.error("❌ User has no passwordHash! User data:", JSON.stringify(user, null, 2));
      return res.status(500).json({
        message: "Account configuration error. Please contact administrator."
      });
    }

    // Tạm thời tắt kiểm tra email verification cho môi trường dev
    // if (!user.isEmailVerified) {
    //   return res
    //     .status(403)
    //     .json({ message: "Please verify your email to log in" });
    // }

    console.log("Comparing password...");
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      console.log("Password mismatch for user:", username);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("Creating access token...");
    console.log("ACCESS_TOKEN_SECRET exists:", !!process.env.ACCESS_TOKEN_SECRET);

    // tạo access token
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    console.log("Access token created");

    // tạo refresh token
    console.log("Creating refresh token...");
    const refreshToken = crypto.randomBytes(64).toString("hex");
    console.log("Refresh token created");

    // save refresh token vào db
    console.log("Saving session to DB...");
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });
    console.log("Session saved");

    // trả về refresh token dưới dạng httpOnly cookie
    console.log("Setting cookie...");
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none", // cho phép gửi cookie trong cross-site requests
      maxAge: REFRESH_TOKEN_TTL,
    });

    console.log("Login successful for user:", username);
    // return access token and user data
    return res.status(200).json({
      message: `User ${user.username} logged in`,
      data: {
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token: accessToken,
      },
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    console.error("Error stack:", error.stack);
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

exports.logOut = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // xóa refresh token khỏi db
      await Session.deleteOne({ refreshToken: token });

      // xóa cookie refresh token ở client
      res.clearCookie("refreshToken");
    }

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      console.error("Refresh token not found in cookies");
      return res.status(401).json({ message: "Token not found" });
    }

    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      console.error("Session not found for token:", token);
      return res.status(403).json({ message: "Invalid token or expired" });
    }

    if (session.expiresAt < new Date()) {
      console.error("Token is expired");
      return res.status(403).json({ message: "Token is expired" });
    }

    const accessToken = jwt.sign(
      { userId: session.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    next(error);
  }
};

exports.googleCallback = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=authentication_failed`
      );
    }

    // Tạo access token
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // Tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Lưu refresh token vào database
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    // Redirect về frontend với access token
    const redirectUrl = `${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}&user=${encodeURIComponent(
      JSON.stringify({
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      })
    )}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=callback_failed`
    );
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Không tiết lộ thông tin user có tồn tại hay không
      return res.status(200).json({
        message: "If the email exists, a password reset link has been sent"
      });
    }

    // Tạo reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Lưu token vào database
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 giờ
    await user.save();

    // Gửi email
    try {
      const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;

      await sendEmail({
        to: email,
        subject: "Reset your password",
        template: "resetPassword.ejs",
        data: {
          username: user.username,
          resetUrl,
          expiresIn: 1, // 1 hour
        },
      });

      return res.status(200).json({
        message: "Password reset link sent to your email"
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Xóa token nếu gửi email thất bại
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(500).json({
        message: "Failed to send reset email. Please try again later."
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    // Hash token để so sánh
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Tìm user với token hợp lệ và chưa hết hạn
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token"
      });
    }

    // Hash password mới
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật password và xóa reset token
    user.passwordHash = hashPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully"
    });
  } catch (error) {
    next(error);
  }
};
