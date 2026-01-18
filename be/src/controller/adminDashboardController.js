// src/controllers/adminDashboardController.js
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

/**
 * @desc Lấy thống kê tổng quan cho dashboard
 * @route GET /api/admin/dashboard/stats
 * @access Admin only
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        console.log("=== GET DASHBOARD STATS ===");

        // Đếm tổng số users (theo role)
        const [totalUsers, totalBuyers, totalSellers, totalAdmins] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "buyer" }),
            User.countDocuments({ role: "seller" }),
            User.countDocuments({ role: "admin" }),
        ]);

        // Đếm users theo status
        const [activeUsers, bannedUsers] = await Promise.all([
            User.countDocuments({ status: "active" }),
            User.countDocuments({ status: "banned" }),
        ]);

        // Đếm tổng số products
        const totalProducts = await Product.countDocuments();

        // Đếm tổng số orders
        const totalOrders = await Order.countDocuments();

        // Đếm orders theo status (nếu có)
        const ordersByStatus = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        // Lấy users mới trong 7 ngày gần đây
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newUsersLast7Days = await User.countDocuments({
            createdAt: { $gte: sevenDaysAgo },
        });

        // Lấy products mới trong 7 ngày gần đây
        const newProductsLast7Days = await Product.countDocuments({
            createdAt: { $gte: sevenDaysAgo },
        });

        // Lấy orders mới trong 7 ngày gần đây
        const newOrdersLast7Days = await Order.countDocuments({
            createdAt: { $gte: sevenDaysAgo },
        });

        const stats = {
            users: {
                total: totalUsers,
                buyers: totalBuyers,
                sellers: totalSellers,
                admins: totalAdmins,
                active: activeUsers,
                banned: bannedUsers,
                newLast7Days: newUsersLast7Days,
            },
            products: {
                total: totalProducts,
                newLast7Days: newProductsLast7Days,
            },
            orders: {
                total: totalOrders,
                byStatus: ordersByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                newLast7Days: newOrdersLast7Days,
            },
        };

        console.log("Dashboard stats:", JSON.stringify(stats, null, 2));

        return res.json({
            success: true,
            data: stats,
        });
    } catch (err) {
        console.error("Error in getDashboardStats:", err);
        return next(err);
    }
};
