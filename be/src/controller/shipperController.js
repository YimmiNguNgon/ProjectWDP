const Order = require("../models/Order");
const { evaluateSellerTrust } = require("../services/sellerTrustService");
const notificationService = require("../services/notificationService");

const PAGE_SIZE = 20;

exports.getAvailableOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || PAGE_SIZE);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ status: "ready_to_ship", shipper: null })
        .populate("buyer", "username email")
        .populate("seller", "username sellerInfo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ status: "ready_to_ship", shipper: null }),
    ]);

    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || PAGE_SIZE);
    const skip = (page - 1) * limit;

    const filter = { shipper: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyer", "username email")
        .populate("seller", "username sellerInfo")
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

exports.acceptOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: "ready_to_ship", shipper: null },
      {
        status: "shipping",
        shipper: req.user._id,
        $push: {
          statusHistory: {
            status: "shipping",
            timestamp: new Date(),
            note: `Accepted by shipper ${req.user.username}`,
          },
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(409).json({ message: "Order no longer available" });
    }

    // Populate items to get product names
    await order.populate("items.productId", "title");
    const productNames = (order.items || [])
      .map((item) => item.productId?.title || item.title || "Product")
      .filter(Boolean);
    const productLabel = productNames.length === 1
      ? productNames[0]
      : productNames.length > 1
        ? `${productNames[0]} and ${productNames.length - 1} more`
        : "your order";

    // Notify buyer
    notificationService.sendNotification({
      recipientId: order.buyer,
      type: "order_shipping",
      title: `"${productLabel}" is on the way`,
      body: `Your order is being delivered by ${req.user.username}.`,
      link: `/purchases/${order._id}`,
      metadata: { orderId: order._id },
    }).catch(() => {});

    // Notify seller
    notificationService.sendNotification({
      recipientId: order.seller,
      type: "order_shipping",
      title: `"${productLabel}" picked up by shipper`,
      body: `Shipper ${req.user.username} has picked up the order.`,
      link: `/seller/orders`,
      metadata: { orderId: order._id },
    }).catch(() => {});

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

exports.rejectOrder = async (req, res, next) => {
  res.json({ ok: true, message: "Order declined" });
};

exports.markDelivered = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      shipper: req.user._id,
      status: "shipping",
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found or not yours" });
    }

    order.status = "delivered";
    order.deliveredAt = new Date();
    order.statusHistory.push({
      status: "delivered",
      timestamp: new Date(),
      note: `Delivered by shipper ${req.user.username}`,
    });
    await order.save();

    // Populate items to get product names
    await order.populate("items.productId", "title");
    const deliveredProductNames = (order.items || [])
      .map((item) => item.productId?.title || item.title || "Product")
      .filter(Boolean);
    const deliveredLabel = deliveredProductNames.length === 1
      ? deliveredProductNames[0]
      : deliveredProductNames.length > 1
        ? `${deliveredProductNames[0]} and ${deliveredProductNames.length - 1} more`
        : "your order";

    // Trigger seller trust evaluation
    evaluateSellerTrust(order.seller, "ORDER_DELIVERED").catch(() => {});

    // Notify buyer
    notificationService.sendNotification({
      recipientId: order.buyer,
      type: "order_delivered",
      title: `"${deliveredLabel}" has been delivered`,
      body: `Please confirm receipt of your order.`,
      link: `/purchases/${order._id}`,
      metadata: { orderId: order._id },
    }).catch(() => {});

    // Notify seller
    notificationService.sendNotification({
      recipientId: order.seller,
      type: "order_delivered",
      title: `"${deliveredLabel}" delivered successfully`,
      body: `Shipper ${req.user.username} has completed the delivery.`,
      link: `/seller/orders`,
      metadata: { orderId: order._id },
    }).catch(() => {});

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

exports.getShipperStats = async (req, res, next) => {
  try {
    const shipperId = req.user._id;

    const [delivered, inTransit, totalAccepted] = await Promise.all([
      Order.countDocuments({ shipper: shipperId, status: "delivered" }),
      Order.countDocuments({ shipper: shipperId, status: "shipping" }),
      Order.countDocuments({ shipper: shipperId }),
    ]);

    res.json({ delivered, inTransit, totalAccepted });
  } catch (err) {
    next(err);
  }
};
