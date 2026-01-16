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

        const [ordersBought, ordersSold, reviewsGiven, reviewsReceived, complaintsAsBuyer, complaintsAsSeller] = await Promise.all([
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
