const Revenue = require("../models/Revenue");

// ─── Seller: doanh thu của mình ──────────────────────────────────────────────
exports.getSellerRevenue = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { startDate, endDate } = req.query;

    const match = { type: "seller_revenue", seller: sellerId };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [records, monthly] = await Promise.all([
      Revenue.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalNet: { $sum: "$amount" },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      Revenue.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            net: { $sum: "$amount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const totalNet = records[0]?.totalNet ?? 0;
    const totalOrders = records[0]?.totalOrders ?? 0;
    // sellerRevenue = 95% of gross => gross = sellerRevenue / 0.95
    const totalGross = totalNet / 0.95;
    const totalFee = totalGross - totalNet;

    const monthlyData = monthly.map((m) => ({
      month: `${m._id.month}/${m._id.year}`,
      net: m.net,
      gross: m.net / 0.95,
      fee: (m.net / 0.95) * 0.05,
      orders: m.orders,
    }));

    res.json({
      totalGross: parseFloat(totalGross.toFixed(2)),
      totalFee: parseFloat(totalFee.toFixed(2)),
      totalNet: parseFloat(totalNet.toFixed(2)),
      totalOrders,
      monthly: monthlyData,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: doanh thu hệ thống ────────────────────────────────────────────────
exports.getAdminRevenue = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [totals, monthly, topSellers] = await Promise.all([
      // Tổng theo từng type
      Revenue.aggregate([
        { $match: { type: { $in: ["system_commission", "system_shipping"] }, ...dateFilter } },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Theo tháng (chỉ system types)
      Revenue.aggregate([
        { $match: { type: { $in: ["system_commission", "system_shipping"] }, ...dateFilter } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              type: "$type",
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Top sellers đóng góp nhiều commission nhất
      Revenue.aggregate([
        { $match: { type: "system_commission", ...dateFilter } },
        {
          $group: {
            _id: "$seller",
            commission: { $sum: "$amount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { commission: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "sellerInfo",
          },
        },
        {
          $project: {
            commission: 1,
            orders: 1,
            username: { $arrayElemAt: ["$sellerInfo.username", 0] },
          },
        },
      ]),
    ]);

    const commissionRow = totals.find((t) => t._id === "system_commission");
    const shippingRow = totals.find((t) => t._id === "system_shipping");
    const totalCommission = commissionRow?.total ?? 0;
    const totalShipping = shippingRow?.total ?? 0;

    // Gộp monthly theo month
    const monthMap = {};
    for (const m of monthly) {
      const key = `${m._id.month}/${m._id.year}`;
      if (!monthMap[key]) monthMap[key] = { month: key, commission: 0, shipping: 0, total: 0 };
      if (m._id.type === "system_commission") monthMap[key].commission += m.total;
      if (m._id.type === "system_shipping") monthMap[key].shipping += m.total;
      monthMap[key].total += m.total;
    }
    const monthlyData = Object.values(monthMap).sort((a, b) => {
      const [am, ay] = a.month.split("/").map(Number);
      const [bm, by] = b.month.split("/").map(Number);
      return ay !== by ? ay - by : am - bm;
    });

    res.json({
      totalCommission: parseFloat(totalCommission.toFixed(2)),
      totalShipping: parseFloat(totalShipping.toFixed(2)),
      totalRevenue: parseFloat((totalCommission + totalShipping).toFixed(2)),
      totalOrders: commissionRow?.count ?? 0,
      monthly: monthlyData,
      topSellers,
    });
  } catch (err) {
    next(err);
  }
};
