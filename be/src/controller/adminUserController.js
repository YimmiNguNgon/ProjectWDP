// src/controllers/adminUserController.js
const mongoose = require("mongoose");
const User = require("../models/User");

/**
 * @desc Lấy tất cả người dùng với phân trang và lọc
 * @route GET /api/admin/users?page=<page>&limit=<limit>&search=<search>&role=<role>&status=<status>
 * @access Admin only
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        console.log("=== GET ALL USERS REQUEST ===");
        console.log("Query params:", req.query);
        console.log("User:", req.user ? { id: req.user._id, role: req.user.role } : "No user");

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const skip = (page - 1) * limit;

        let query = {};

        // Exclude admin users from the list (optional)
        if (req.query.excludeAdmin === 'true') {
            query.role = { $ne: 'admin' };
        }

        // Filter by role
        if (req.query.role && ['buyer', 'seller', 'admin'].includes(req.query.role)) {
            query.role = req.query.role;
        }

        // Filter by status
        if (req.query.status && ['active', 'banned', 'suspended', 'restricted'].includes(req.query.status)) {
            query.status = req.query.status;
        }

        // Search by username or email
        if (req.query.search && req.query.search.trim()) {
            const searchRegex = { $regex: req.query.search.trim(), $options: "i" };
            query.$or = [
                { username: searchRegex },
                { email: searchRegex }
            ];
        }

        // Filter by new users (created in last 14 days)
        if (req.query.newUsers === 'true') {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            query.createdAt = { $gte: twoWeeksAgo };
        }

        console.log("MongoDB query:", JSON.stringify(query));

        const users = await User.find(query)
            .select("-passwordHash")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("bannedBy", "username")
            .lean();

        const total = await User.countDocuments(query);

        console.log(`Found ${users.length} users, total: ${total}`);

        return res.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("Error in getAllUsers:", err);
        return next(err);
    }
};

/**
 * @desc Lấy chi tiết một người dùng
 * @route GET /api/admin/users/:id
 * @access Admin only
 */
exports.getUserDetail = async (req, res, next) => {
    try {
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
            success: true,
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

/**
 * @desc Cập nhật thông tin người dùng
 * @route PUT /api/admin/users/:id
 * @access Admin only
 */
exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { username, email, role } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Cannot modify another admin
        if (user.role === "admin" && user._id.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: "Cannot modify other admin users" });
        }

        // Update fields if provided
        if (username) user.username = username;
        if (email) user.email = email;
        if (role && ["buyer", "seller", "admin"].includes(role)) {
            user.role = role;
        }

        await user.save();

        return res.json({
            success: true,
            message: "User updated successfully",
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Username or email already exists" });
        }
        return next(err);
    }
};

/**
 * @desc Xóa người dùng
 * @route DELETE /api/admin/users/:id
 * @access Admin only
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Cannot delete admin users
        if (user.role === "admin") {
            return res.status(400).json({ message: "Cannot delete admin users" });
        }

        // Cannot delete yourself
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "Cannot delete yourself" });
        }

        await User.findByIdAndDelete(id);

        return res.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * @desc Ban người dùng
 * @route POST /api/admin/users/:id/ban
 * @access Admin only
 */
exports.banUser = async (req, res, next) => {
    try {
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
            success: true,
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

/**
 * @desc Unban người dùng
 * @route POST /api/admin/users/:id/unban
 * @access Admin only
 */
exports.unbanUser = async (req, res, next) => {
    try {
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
            success: true,
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
