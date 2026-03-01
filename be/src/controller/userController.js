// src/controllers/userController.js
const mongoose = require("mongoose");
const User = require("../models/User");

const bcrypt = require("bcryptjs");

// ----------------- ADMIN: BAN USER -----------------
exports.adminBanUser = async (req, res, next) => {
  try {
    // Only admin can ban users
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Ban reason is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cannot ban another admin
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot ban admin users" });
    }

    // Cannot ban yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot ban yourself" });
    }

    // Already banned
    if (user.status === "banned") {
      return res.status(400).json({ message: "User is already banned" });
    }

    // Ban the user
    user.status = "banned";
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banReason = reason.trim();
    await user.save();

    return res.json({
      message: "User banned successfully",
      data: {
        id: user._id,
        username: user.username,
        status: user.status,
        bannedAt: user.bannedAt,
        banReason: user.banReason,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- ADMIN: UNBAN USER -----------------
exports.adminUnbanUser = async (req, res, next) => {
  try {
    // Only admin can unban users
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Not banned
    if (user.status !== "banned") {
      return res.status(400).json({ message: "User is not banned" });
    }

    // Unban the user
    user.status = "active";
    user.bannedAt = null;
    user.bannedBy = null;
    user.banReason = null;
    await user.save();

    return res.json({
      message: "User unbanned successfully",
      data: {
        id: user._id,
        username: user.username,
        status: user.status,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- ADMIN: GET ALL USERS -----------------
exports.adminGetUsers = async (req, res, next) => {
  try {
    // Only admin can access
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;
    const status = req.query.status; // 'all', 'active', 'banned', 'suspended'
    const search = req.query.search; // search by username

    let query = {};

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Search by username
    if (search && search.trim()) {
      query.username = { $regex: search.trim(), $options: "i" };
    }

    const rows = await User.find(query)
      .select("-passwordHash") // Don't send password hash
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("bannedBy", "username")
      .lean();

    const total = await User.countDocuments(query);

    return res.json({
      data: rows,
      page,
      limit,
      total,
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- ADMIN: GET USER DETAIL -----------------
exports.adminGetUserDetail = async (req, res, next) => {
  try {
    // Only admin can access
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id)
      .select("-passwordHash")
      .populate("bannedBy", "username")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user statistics
    const Order = require("../models/Order");
    const Review = require("../models/Review");
    const Complaint = require("../models/Complaint");

    const [
      ordersBought,
      ordersSold,
      reviewsGiven,
      reviewsReceived,
      complaintsAsBuyer,
      complaintsAsSeller,
    ] = await Promise.all([
      Order.countDocuments({ buyer: id }),
      Order.countDocuments({ seller: id }),
      Review.countDocuments({ reviewer: id }),
      Review.countDocuments({ seller: id }),
      Complaint.countDocuments({ buyer: id }),
      Complaint.countDocuments({ seller: id }),
    ]);

    return res.json({
      data: {
        ...user,
        statistics: {
          ordersBought,
          ordersSold,
          reviewsGiven,
          reviewsReceived,
          complaintsAsBuyer,
          complaintsAsSeller,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.authMe = async (req, res) => {
  try {
    const user = req.user; //get form the middleware

    return res.status(200).json({ user });
  } catch (error) {
    console.log("Error get user information: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { username, avatarUrl } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.username = username;
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    await user.save();

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.updateEmail = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // sau này làm login google thì check provider
    // nếu provider != local thì ko cho đổi email

    user.email = email;
    await user.save();

    return res.status(200).json({ message: "Email updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    user.passwordHash = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// ----------------- SAVE SELLER -----------------
exports.saveSeller = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sellerId } = req.params;

    if (!mongoose.isValidObjectId(sellerId)) {
      return res.status(400).json({ message: "Invalid seller id" });
    }

    // Check if seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    if (seller.role !== "seller") {
      return res.status(400).json({ message: "Only seller accounts can be saved" });
    }

    // Cannot save yourself
    if (sellerId === userId.toString()) {
      return res.status(400).json({ message: "Cannot save yourself as a seller" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already saved
    const isAlreadySaved = user.savedSellers.some(
      (id) => String(id) === String(sellerId),
    );
    if (isAlreadySaved) {
      return res.status(400).json({ message: "Seller already saved" });
    }

    user.savedSellers.push(sellerId);
    await user.save();

    return res.status(200).json({
      message: "Seller saved successfully",
      data: { sellerId }
    });
  } catch (error) {
    next(error);
  }
};

// ----------------- UNSAVE SELLER -----------------
exports.unsaveSeller = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sellerId } = req.params;

    if (!mongoose.isValidObjectId(sellerId)) {
      return res.status(400).json({ message: "Invalid seller id" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove seller from savedSellers array
    user.savedSellers = user.savedSellers.filter(
      id => id.toString() !== sellerId
    );
    await user.save();

    return res.status(200).json({
      message: "Seller unsaved successfully",
      data: { sellerId }
    });
  } catch (error) {
    next(error);
  }
};

// ----------------- GET SAVED SELLERS -----------------
exports.getSavedSellers = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('savedSellers', 'username email avatarUrl reputationScore')
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      data: user.savedSellers || []
    });
  } catch (error) {
    next(error);
  }
};

// ----------------- HIDE ORDER -----------------
exports.hideOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    // Verify order exists and belongs to user
    const Order = require("../models/Order");
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is buyer or seller of this order
    const isBuyer = order.buyer.toString() === userId.toString();
    const isSeller = order.seller.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: "You don't have access to this order" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already hidden
    if (user.hiddenOrders.includes(orderId)) {
      return res.status(400).json({ message: "Order already hidden" });
    }

    user.hiddenOrders.push(orderId);
    await user.save();

    return res.status(200).json({
      message: "Order hidden successfully",
      data: { orderId }
    });
  } catch (error) {
    next(error);
  }
};

// ----------------- UNHIDE ORDER -----------------
exports.unhideOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove order from hiddenOrders array
    user.hiddenOrders = user.hiddenOrders.filter(
      id => id.toString() !== orderId
    );
    await user.save();

    return res.status(200).json({
      message: "Order unhidden successfully",
      data: { orderId }
    });
  } catch (error) {
    next(error);
  }
};
