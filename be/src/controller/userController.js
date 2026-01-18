// src/controllers/userController.js
const mongoose = require("mongoose");
const User = require("../models/User");

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

// ----------------- GET USER PROFILE -----------------
exports.getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-passwordHash").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      data: user,
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- UPDATE USER PROFILE -----------------
exports.updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { username, phone, avatar, bio } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    // Update other fields
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    const updatedUser = await User.findById(userId).select("-passwordHash").lean();

    return res.json({
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- ADD USER ADDRESS -----------------
exports.addUserAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { fullName, phone, addressLine1, addressLine2, city, state, country, isDefault } = req.body;

    // Validate required fields
    if (!fullName || !phone || !addressLine1 || !city || !state) {
      return res.status(400).json({ message: "Missing required address fields" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If this is set as default, unset all other default addresses
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default
    const newAddress = {
      fullName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      state,
      country: country || "Vietnam",
      isDefault: user.addresses.length === 0 ? true : isDefault || false,
    };

    user.addresses.push(newAddress);
    await user.save();

    return res.json({
      message: "Address added successfully",
      data: user.addresses[user.addresses.length - 1],
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- UPDATE USER ADDRESS -----------------
exports.updateUserAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;
    const { fullName, phone, addressLine1, addressLine2, city, state, country, isDefault } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Update fields
    if (fullName) address.fullName = fullName;
    if (phone) address.phone = phone;
    if (addressLine1) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city) address.city = city;
    if (state) address.state = state;
    if (country) address.country = country;
    if (req.body.district) address.district = req.body.district;
    if (req.body.ward) address.ward = req.body.ward;

    // If setting as default, unset all other defaults
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
      address.isDefault = true;
    }

    await user.save();

    return res.json({
      message: "Address updated successfully",
      data: address,
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- DELETE USER ADDRESS -----------------
exports.deleteUserAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = address.isDefault;
    address.remove();

    // If deleted address was default and there are other addresses, make the first one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return res.json({
      message: "Address deleted successfully",
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- SET DEFAULT ADDRESS -----------------
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Unset all other defaults
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    address.isDefault = true;
    await user.save();

    return res.json({
      message: "Default address set successfully",
      data: address,
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------- UPGRADE TO PREMIUM -----------------
exports.upgradeToPremium = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.accountType === "premium" && user.premiumExpiresAt && user.premiumExpiresAt > new Date()) {
      return res.status(400).json({
        message: "You already have an active premium subscription",
        expiresAt: user.premiumExpiresAt,
      });
    }

    // Upgrade to premium for 1 year
    user.accountType = "premium";
    user.premiumActivatedAt = new Date();
    user.premiumExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    await user.save();

    const updatedUser = await User.findById(userId).select("-passwordHash").lean();

    return res.json({
      message: "Successfully upgraded to premium!",
      data: updatedUser,
    });
  } catch (err) {
    return next(err);
  }
};
