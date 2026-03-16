const Order = require("../models/Order");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { evaluateSellerTrust } = require("../services/sellerTrustService");
const notificationService = require("../services/notificationService");
const {
  dispatchNextFromQueue,
  toggleShipperAvailability,
} = require("../services/orderDispatchService");

const PAGE_SIZE = 20;

exports.getAvailableOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || PAGE_SIZE);
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { status: { $in: ["ready_to_ship", "queued"] }, shipper: null },
        { status: "pending_acceptance", shipper: req.user._id },
        { status: "waiting_return_shipment", returnShipper: null },
      ],
    };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("buyer", "username email")
        .populate("seller", "username sellerInfo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
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

    const filter = {
      $or: [
        { shipper: req.user._id },
        { returnShipper: req.user._id },
      ],
      status: { $ne: "pending_acceptance" },
    };
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
    const [activeCount, shipperDoc] = await Promise.all([
      Order.countDocuments({
        $or: [
          { shipper: req.user._id, status: "shipping" },
          { returnShipper: req.user._id, status: "return_shipping" },
        ],
      }),
      User.findById(req.user._id).select("shipperInfo").lean(),
    ]);
    const maxOrders = shipperDoc?.shipperInfo?.maxOrders ?? 3;
    if (activeCount >= maxOrders) {
      return res.status(400).json({
        message: `You have reached the maximum order limit (${maxOrders}). Complete an order first.`,
      });
    }

    const pickupUpdate = {
      status: "shipping",
      shipper: req.user._id,
      queuedAt: null,
      $push: {
        statusHistory: {
          status: "shipping",
          timestamp: new Date(),
          note: `Accepted by shipper ${req.user.username}`,
        },
      },
    };

    const returnUpdate = {
      status: "return_shipping",
      returnShipper: req.user._id,
      $push: {
        statusHistory: {
          status: "return_shipping",
          timestamp: new Date(),
          note: `Accepted by shipper ${req.user.username}`,
        },
      },
    };

    // Accept open orders (no shipper yet)
    let order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ["ready_to_ship", "queued"] },
        shipper: null,
      },
      pickupUpdate,
      { new: true },
    );

    // Accept pending_acceptance order assigned to this shipper
    if (!order) {
      order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "pending_acceptance",
          shipper: req.user._id,
        },
        pickupUpdate,
        { new: true },
      );
    }

    if (!order) {
      order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "waiting_return_shipment",
          returnShipper: null,
        },
        returnUpdate,
        { new: true },
      );
    }

    if (!order) {
      return res.status(409).json({ message: "Order no longer available" });
    }

    // Populate items to get product names
    await order.populate("items.productId", "title");
    const productNames = (order.items || [])
      .map((item) => item.productId?.title || item.title || "Product")
      .filter(Boolean);
    const productLabel =
      productNames.length === 1
        ? productNames[0]
        : productNames.length > 1
          ? `${productNames[0]} and ${productNames.length - 1} more`
          : "your order";

    // Notify buyer
    notificationService
      .sendNotification({
        recipientId: order.buyer,
        type: "order_shipping",
        title: `"${productLabel}" is on the way`,
        body: `Your order is being delivered by ${req.user.username}.`,
        link: `/purchases/${order._id}`,
        metadata: { orderId: order._id },
      })
      .catch(() => { });

    // Notify seller
    notificationService
      .sendNotification({
        recipientId: order.seller,
        type: "order_shipping",
        title: `"${productLabel}" picked up by shipper`,
        body: `Shipper ${req.user.username} has picked up the order.`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      })
      .catch(() => { });

    // Send email to buyer (reuse orderStatusUpdate template)
    if (order?.buyer) {
      const buyer = await User.findById(order.buyer).select("username email");

      if (buyer?.email) {
        setImmediate(() => {
          const statusMessage =
            "Your order has been picked up by the shipper and is now on the way.";

          sendEmail({
            to: buyer.email,
            subject: `Order Status Updated - #${order._id}`,
            template: "orderStatusUpdate.ejs",
            data: {
              username: buyer.username,
              orderId: order._id,
              status: "shipping",
              statusMessage,
              note: `Accepted by shipper ${req.user.username}`,
              orderUrl: `${process.env.CLIENT_URL || "http://localhost:5173"
                }/purchases/${order._id}`,
            },
          }).catch((err) =>
            console.error("[AcceptOrderEmail] failed:", err.message),
          );
        });
      }
    }

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

exports.rejectOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending_acceptance",
        shipper: req.user._id,
      },
      {
        shipper: null,
        status: "ready_to_ship",
        $push: {
          statusHistory: {
            status: "ready_to_ship",
            timestamp: new Date(),
            note: `Rejected by shipper ${req.user.username}. Available for reassignment.`,
          },
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found or cannot be rejected" });
    }

    // Leave as ready_to_ship so ALL shippers (including the one who rejected) can see it
    res.json({ ok: true, message: "Order rejected and returned to available pool" });
  } catch (err) {
    next(err);
  }
};

exports.markDelivered = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [
        { shipper: req.user._id, status: "shipping" },
        { returnShipper: req.user._id, status: "return_shipping" }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found or not yours" });
    }

    const isReturn = order.status === "return_shipping";
    const nextStatus = isReturn ? "delivered_to_seller" : "delivered";

    order.status = nextStatus;
    if (!isReturn) {
      order.deliveredAt = new Date();
    }
    order.statusHistory.push({
      status: nextStatus,
      timestamp: new Date(),
      note: `Delivered by shipper ${req.user.username}`,
    });
    await order.save();

    // After delivery, dispatch the next queued order (fire-and-forget)
    setImmediate(() => dispatchNextFromQueue(req.user._id).catch(() => { }));

    // Populate items to get product names
    await order.populate("items.productId", "title");
    const deliveredProductNames = (order.items || [])
      .map((item) => item.productId?.title || item.title || "Product")
      .filter(Boolean);
    const deliveredLabel =
      deliveredProductNames.length === 1
        ? deliveredProductNames[0]
        : deliveredProductNames.length > 1
          ? `${deliveredProductNames[0]} and ${deliveredProductNames.length - 1} more`
          : "your order";

    // Trigger seller trust evaluation
    evaluateSellerTrust(order.seller, "ORDER_DELIVERED").catch(() => { });

    // Notify buyer
    notificationService
      .sendNotification({
        recipientId: order.buyer,
        type: "order_delivered",
        title: `"${deliveredLabel}" has been delivered`,
        body: `Please confirm receipt of your order.`,
        link: `/purchases/${order._id}`,
        metadata: { orderId: order._id },
      })
      .catch(() => { });

    // Notify seller
    notificationService
      .sendNotification({
        recipientId: order.seller,
        type: "order_delivered",
        title: `"${deliveredLabel}" delivered successfully`,
        body: `Shipper ${req.user.username} has completed the delivery.`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      })
      .catch(() => { });

    // Send email to buyer (reuse orderStatusUpdate template)
    if (order?.buyer) {
      const buyer = await User.findById(order.buyer).select("username email");

      if (buyer?.email) {
        setImmediate(() => {
          const statusMessage =
            "Your order has been delivered successfully. Please confirm receipt.";

          sendEmail({
            to: buyer.email,
            subject: `Order Status Updated - #${order._id}`,
            template: "orderStatusUpdate.ejs",
            data: {
              username: buyer.username,
              orderId: order._id,
              status: "delivered",
              statusMessage,
              note: `Delivered by shipper ${req.user.username}`,
              orderUrl: `${process.env.CLIENT_URL || "http://localhost:5173"
                }/purchases/${order._id}`,
            },
          }).catch((err) =>
            console.error("[DeliveredEmail] failed:", err.message),
          );
        });
      }
    }

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

exports.getShipperStats = async (req, res, next) => {
  try {
    const shipperId = req.user._id;

    const [delivered, inTransit, totalAccepted, queued] = await Promise.all([
      Order.countDocuments({
        $or: [
          { shipper: shipperId, status: "delivered" },
          { returnShipper: shipperId, status: "delivered_to_seller" }
        ]
      }),
      Order.countDocuments({
        $or: [
          { shipper: shipperId, status: "shipping" },
          { returnShipper: shipperId, status: "return_shipping" }
        ]
      }),
      Order.countDocuments({
        $or: [
          { shipper: shipperId },
          { returnShipper: shipperId }
        ]
      }),
      Order.countDocuments({ status: "queued", shipper: null }),
    ]);

    // Load shipper limits
    const shipperDoc = await User.findById(shipperId)
      .select("shipperInfo")
      .lean();
    const maxOrders = shipperDoc?.shipperInfo?.maxOrders ?? 3;
    const isAvailable = shipperDoc?.shipperInfo?.isAvailable ?? true;

    res.json({
      delivered,
      inTransit,
      totalAccepted,
      queuedOrders: queued,
      maxOrders,
      isAvailable,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be a boolean" });
    }
    const shipper = await toggleShipperAvailability(req.user._id, isAvailable);
    res.json({
      ok: true,
      isAvailable: shipper.shipperInfo.isAvailable,
      maxOrders: shipper.shipperInfo.maxOrders,
    });
  } catch (err) {
    next(err);
  }
};
