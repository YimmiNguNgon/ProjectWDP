const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const toMonthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

const getRecentMonths = (count = 6) => {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      key: toMonthKey(date.getFullYear(), date.getMonth() + 1),
      label: date.toLocaleString("en-US", { month: "short" }),
    });
  }
  return months;
};

/**
 * @desc Get overview statistics for admin dashboard
 * @route GET /api/admin/dashboard/stats
 * @access Admin only
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMonths = getRecentMonths(6);
    const trendStart = new Date(
      recentMonths[0].year,
      recentMonths[0].month - 1,
      1,
    );

    const [totalUsers, totalBuyers, totalSellers, totalAdmins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "seller" }),
      User.countDocuments({ role: "admin" }),
    ]);

    const [activeUsers, bannedUsers] = await Promise.all([
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "banned" }),
    ]);

    const [totalProducts, activeProducts] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ listingStatus: "active" }),
    ]);

    const totalOrders = await Order.countDocuments();

    const ordersByStatusAgg = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const [
      newUsersLast7Days,
      newProductsLast7Days,
      newOrdersLast7Days,
      deliveredOrders,
      cancelledOrders,
      orderTrendAgg,
      userTrendAgg,
      productTrendAgg,
      topProductsAgg,
      totalRevenueAgg,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Product.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Order.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["cancelled", "failed", "returned"]] },
                  0,
                  "$totalAmount",
                ],
              },
            },
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Product.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $nin: ["cancelled", "failed", "returned"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            unitsSold: { $sum: { $ifNull: ["$items.quantity", 0] } },
            revenue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$items.unitPrice", 0] },
                  { $ifNull: ["$items.quantity", 0] },
                ],
              },
            },
            orderIds: { $addToSet: "$_id" },
            fallbackTitle: { $first: "$items.title" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            title: { $ifNull: ["$product.title", "$fallbackTitle"] },
            image: {
              $ifNull: [
                { $arrayElemAt: ["$product.images", 0] },
                "$product.image",
              ],
            },
            unitsSold: 1,
            revenue: 1,
            orderCount: { $size: "$orderIds" },
          },
        },
        { $sort: { unitsSold: -1, revenue: -1 } },
        { $limit: 3 },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $nin: ["cancelled", "failed", "returned"] },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const orderTrendMap = new Map(
      orderTrendAgg.map((item) => [toMonthKey(item._id.year, item._id.month), item]),
    );
    const userTrendMap = new Map(
      userTrendAgg.map((item) => [toMonthKey(item._id.year, item._id.month), item.count]),
    );
    const productTrendMap = new Map(
      productTrendAgg.map((item) => [toMonthKey(item._id.year, item._id.month), item.count]),
    );

    const monthlyTrend = recentMonths.map((month) => {
      const orderData = orderTrendMap.get(month.key);
      return {
        key: month.key,
        label: month.label,
        year: month.year,
        month: month.month,
        orders: orderData?.count || 0,
        revenue: Number((orderData?.revenue || 0).toFixed(2)),
        newUsers: userTrendMap.get(month.key) || 0,
        newProducts: productTrendMap.get(month.key) || 0,
      };
    });

    const totalRevenue = Number((totalRevenueAgg[0]?.amount || 0).toFixed(2));
    const deliveredRate =
      totalOrders > 0 ? Number(((deliveredOrders / totalOrders) * 100).toFixed(1)) : 0;
    const cancelledRate =
      totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;

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
        active: activeProducts,
        newLast7Days: newProductsLast7Days,
      },
      orders: {
        total: totalOrders,
        byStatus: ordersByStatusAgg.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        newLast7Days: newOrdersLast7Days,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        deliveredRate,
        cancelledRate,
      },
      revenue: {
        total: totalRevenue,
      },
      monthlyTrend,
      topSellingProducts: topProductsAgg.map((item, index) => ({
        rank: index + 1,
        productId: item.productId,
        title: item.title || `Product ${index + 1}`,
        image: item.image || "",
        unitsSold: item.unitsSold || 0,
        revenue: Number((item.revenue || 0).toFixed(2)),
        orderCount: item.orderCount || 0,
      })),
    };

    return res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    return next(err);
  }
};
