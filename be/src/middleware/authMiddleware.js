const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

exports.protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access token not found or expired" });
    }

    // verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_me';
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized User" });
      }

      //find user
      req.user = await User.findById(decoded.userId).select("-passwordHash");

      if (!req.user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (req.user.status === "banned") {
        return res.status(403).json({ message: "User is banned" });
      }

      next();
    });
  } catch (error) { }
};
