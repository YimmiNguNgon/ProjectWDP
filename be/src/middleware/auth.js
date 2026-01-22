const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecretjwtkey_change_me"
    );
    // attach minimal user (mô phỏng)
    req.user = await User.findById(payload.userId).lean();
    if (!req.user) return res.status(401).json({ message: "User not found" });

    // Check if user is banned
    if (req.user.status === "banned") {
      return res.status(403).json({
        message: "Your account has been banned",
        reason: req.user.banReason || "Violation of terms of service"
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token", err: err.message });
  }
};

module.exports = auth;
