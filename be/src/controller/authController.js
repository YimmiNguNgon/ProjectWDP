// src/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_me';

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !password || !email)
      return res.status(400).json({ message: 'username, email & password required' });

    // Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'username taken' });

    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await User.create({
      username,
      email,
      passwordHash: hash,
      role: role || 'buyer',
    });
    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.status(201).json({
      data: {
        user: payload,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'username & password required' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ message: 'invalid credentials' });
    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({
      data: {
        user: payload,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Logout (simple version - just a success response since JWT is stateless)
exports.logOut = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // Optionally, you could blacklist the token here if you have a token blacklist system
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    // Simple refresh - issue a new token with extended expiry
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ accessToken: newToken });
  } catch (err) {
    next(err);
  }
};

// Email verification (placeholder)
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    // TODO: Implement email verification logic
    res.json({ message: 'Email verification not yet implemented' });
  } catch (err) {
    next(err);
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
    if (!user) return res.status(401).json({ message: 'Authentication failed' });

    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Redirect to frontend with token
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/google/success?token=${token}`);
  } catch (err) {
    next(err);
  }
};
