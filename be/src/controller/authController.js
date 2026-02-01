// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User.js");
const Session = require("../models/Session.js");
const sendEmail = require("../utils/sendEmail.js");

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_me';
const ACCESS_TOKEN_TTL = "24h";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;

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
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: Date.now() + 5 * 60 * 1000,
    });

    await newUser.save();

    try {
      const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

      await sendEmail({
        to: email,
        subject: "Xác thực tài khoản của bạn",
        template: "verifyEmail.ejs",
        data: {
          username,
          verifyUrl,
          expiresIn: 5,
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
    console.log("Login request body:", req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log(
        "Missing fields - username:",
        username,
        "password:",
        password ? "exists" : "missing",
      );
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email to log in" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // tạo access token
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    // tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // save refresh token vào db
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // trả về refresh token dưới dạng httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

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

// Refresh token
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
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
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

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Tìm user theo email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Không tiết lộ user có tồn tại hay không (security best practice)
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    // Tạo reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Lưu token vào DB (expired sau 1 giờ)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Tạo reset URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/auth/reset-password?token=${resetToken}`;

    // Gửi email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'resetPassword.ejs',
        data: {
          username: user.username,
          resetUrl,
          expiresIn: 1, // 1 hour
        },
      });

      res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (emailError) {
      // Nếu gửi email thất bại, xóa token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error('Email sending failed:', emailError);
      return res.status(500).json({ message: 'Error sending email. Please try again later.' });
    }
  } catch (err) {
    next(err);
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash token để so sánh với DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Tìm user với token hợp lệ và chưa hết hạn
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash password mới
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // Update password và xóa reset token
    user.passwordHash = hash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
};

// Google OAuth callback
exports.googleCallback = async (req, res, next) => {
  try {
    // Passport already authenticated the user and attached it to req.user
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "Authentication failed" });

    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    // Redirect to frontend with token
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/auth/google/success?token=${token}`);
  } catch (err) {
    next(err);
  }
};

exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const { username, email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "If the email exists, a verification email will be sent",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (
      user.lastVerificationEmailSentAt &&
      Date.now() - user.lastVerificationEmailSentAt.getTime() < RESEND_COOLDOWN
    ) {
      return res.status(429).json({
        message: "Please wait before resending verification email",
      });
    }

    const token = crypto.randomBytes(64).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 5 * 60 * 1000;
    user.lastVerificationEmailSentAt = new Date();

    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Xác thực tài khoản của bạn",
      template: "verifyEmail.ejs",
      data: {
        username,
        verifyUrl,
        expiresIn: 5,
      },
    });

    return res.status(200).json({ message: "Verification email resent" });
  } catch (error) {
    next(error);
  }
};
