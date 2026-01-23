// src/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_me';

exports.register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'username & password required' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'username taken' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await User.create({
      username,
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

// Forgot password (placeholder)
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    // TODO: Implement forgot password logic (send reset email)
    res.json({ message: 'Password reset email sent (not implemented yet)' });
  } catch (err) {
    next(err);
  }
};

// Reset password (placeholder)
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    // TODO: Implement password reset logic
    res.json({ message: 'Password reset not yet implemented' });
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
