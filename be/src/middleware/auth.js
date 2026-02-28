const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  console.log('[Auth] Request to:', req.method, req.path);
  console.log('[Auth] Authorization header:', header);

  if (!header) {
    console.log('[Auth] No authorization header');
    return res.status(401).json({ message: "No token" });
  }

  const token = header.split(" ")[1];
  console.log('[Auth] Token extracted:', token ? `${token.substring(0, 20)}...` : 'no token');

  try {
    const payload = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || "supersecretjwtkey_change_me"
    );
    console.log('[Auth] JWT verified, userId:', payload.userId);

    // attach minimal user (mô phỏng)
    req.user = await User.findById(payload.userId).lean();
    if (!req.user) {
      console.log('[Auth] User not found in database');
      return res.status(401).json({ message: "User not found" });
    }

    console.log('[Auth] User found:', req.user.username, 'status:', req.user.status);

    // Check if user is banned
    if (req.user.status === "banned") {
      console.log('[Auth] User is banned');
      return res.status(403).json({
        message: "Your account has been banned",
        reason: req.user.banReason || "Violation of terms of service"
      });
    }

    console.log('[Auth] Authorization successful');
    next();
  } catch (err) {
    console.log('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ message: "Invalid token", err: err.message });
  }
};

module.exports = auth;
