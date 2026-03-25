const User = require("../models/User");
const Order = require("../models/Order");

exports.getAllShippers = async (req, res, next) => {
  try {
    const shippers = await User.find({ role: "shipper" })
      .select("username email status createdAt shipperInfo")
      .lean();

    if (shippers.length === 0) {
      return res.json({ shippers: [] });
    }

    const shipperIds = shippers.map((s) => s._id);

    const stats = await Order.aggregate([
      { $match: { shipper: { $in: shipperIds } } },
      {
        $group: {
          _id: "$shipper",
          totalAccepted: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ["$status", "shipping"] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = {};
    for (const s of stats) {
      statsMap[s._id.toString()] = s;
    }

    const result = shippers.map((s) => {
      const st = statsMap[s._id.toString()] || { totalAccepted: 0, delivered: 0, completed: 0, inTransit: 0 };
      return {
        ...s,
        isAvailable: s.shipperInfo?.isAvailable ?? true,
        shipperStatus: s.shipperInfo?.shipperStatus ?? "available",
        maxOrders: s.shipperInfo?.maxOrders ?? 3,
        totalAccepted: st.totalAccepted,
        delivered: st.delivered,
        completed: st.completed,
        inTransit: st.inTransit,
      };
    });

    res.json({ shippers: result });
  } catch (err) {
    next(err);
  }
};

exports.updateShipperStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shipperStatus } = req.body;

    const allowed = ["available", "paused"];
    if (!allowed.includes(shipperStatus)) {
      return res.status(400).json({ message: "Invalid shipperStatus. Must be: available | paused" });
    }

    const isAvailable = shipperStatus === "available";

    const shipper = await User.findOneAndUpdate(
      { _id: id, role: "shipper" },
      {
        "shipperInfo.shipperStatus": shipperStatus,
        "shipperInfo.isAvailable": isAvailable,
      },
      { new: true }
    ).select("_id username shipperInfo");

    if (!shipper) {
      return res.status(404).json({ message: "Shipper not found" });
    }

    res.json({ message: "Shipper status updated", shipper });
  } catch (err) {
    next(err);
  }
};

exports.getShipperOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = { shipper: { $ne: null } };
    if (req.query.shipperId) filter.shipper = req.query.shipperId;
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyer", "username email")
        .populate("seller", "username sellerInfo")
        .populate("shipper", "username email")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
