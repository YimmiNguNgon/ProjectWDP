const Order = require("../models/Order");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { evaluateSellerTrust } = require("../services/sellerTrustService");
const notificationService = require("../services/notificationService");
const {
  dispatchNextFromQueue,
  dispatchNextDeliveryFromQueue,
  autoAssignOrder,
  autoAssignDeliveryShipper,
  toggleShipperAvailability,
} = require("../services/orderDispatchService");

const PAGE_SIZE = 20;

exports.getAvailableOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || PAGE_SIZE);
    const skip = (page - 1) * limit;

    const shipperDoc = await User.findById(req.user._id).select("shipperInfo").lean();
    const assignedProvince = shipperDoc?.shipperInfo?.assignedProvince || null;

    // Filter pickup orders by seller's city (sellerCity field), fallback to unfiltered
    const pickupFilter = assignedProvince
      ? {
          status: { $in: ["ready_to_ship", "queued"] },
          shipper: null,
          $or: [
            { sellerCity: assignedProvince },
            { sellerCity: { $in: ["", null] }, "shippingAddress.city": assignedProvince },
          ],
        }
      : { status: { $in: ["ready_to_ship", "queued"] }, shipper: null };

    const query = {
      $or: [
        // Phase 1 pickup orders — same city as shipper
        pickupFilter,
        { status: "pending_acceptance", shipper: req.user._id },
        // Phase 2 delivery orders — same city as buyer
        ...(assignedProvince
          ? [{ status: "delivery_queued", shipper: null, "shippingAddress.city": assignedProvince }]
          : [{ status: "delivery_queued", shipper: null }]),
        { status: "pending_delivery_acceptance", shipper: req.user._id },
        // Return orders
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
        { pickupShipper: req.user._id },
        { returnShipper: req.user._id },
      ],
      status: { $nin: ["pending_acceptance", "pending_delivery_acceptance"] },
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
          { shipper: req.user._id, status: { $in: ["shipping", "delivering"] } },
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

    // Delivery update cho Shipper 2
    const deliveryUpdate = {
      status: "delivering",
      shipper: req.user._id,
      deliveryQueuedAt: null,
      $push: {
        statusHistory: {
          status: "delivering",
          timestamp: new Date(),
          note: `Delivery accepted by shipper ${req.user.username}`,
        },
      },
    };

    // Accept open pickup orders (no shipper yet)
    let order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ["ready_to_ship", "queued"] },
        shipper: null,
      },
      pickupUpdate,
      { new: true },
    );

    // Accept pending_acceptance order assigned to this shipper (Shipper 1)
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

    // Accept delivery_queued order for Shipper 2 (open, no shipper)
    if (!order) {
      order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "delivery_queued",
          shipper: null,
        },
        deliveryUpdate,
        { new: true },
      );
    }

    // Accept pending_delivery_acceptance assigned to this shipper (Shipper 2)
    if (!order) {
      order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "pending_delivery_acceptance",
          shipper: req.user._id,
        },
        deliveryUpdate,
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

    // Đánh dấu shipper đang shipping
    await User.findByIdAndUpdate(req.user._id, {
      "shipperInfo.shipperStatus": "shipping",
      "shipperInfo.isAvailable": false,
    }).catch(() => {});

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
    const rejectingShipperId = req.user._id;

    // Reject Shipper 1 pickup assignment
    let order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending_acceptance",
        shipper: rejectingShipperId,
      },
      {
        shipper: null,
        status: "ready_to_ship",
        $push: {
          statusHistory: {
            status: "ready_to_ship",
            timestamp: new Date(),
            note: `Rejected by shipper ${req.user.username}. Re-assigning to another shipper.`,
          },
        },
      },
      { new: true },
    );

    if (order) {
      // Reset shipper status về available
      await User.findByIdAndUpdate(rejectingShipperId, {
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
      });

      // Notify shipper so frontend can refresh status
      notificationService.sendNotification({
        recipientId: rejectingShipperId,
        type: "shipper_status_updated",
        title: "You are now available",
        body: "Order declined. You are available to accept new orders.",
        link: `/shipper/available`,
        metadata: {},
      }).catch(() => {});

      // Tìm ngay shipper khác ở cùng thành phố, loại trừ shipper vừa reject
      setImmediate(() => autoAssignOrder(order, rejectingShipperId).catch(() => {}));

      return res.json({ ok: true, message: "Order rejected. Reassigning to another shipper." });
    }

    // Reject Shipper 2 delivery assignment → back to in_transit for re-assignment
    order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending_delivery_acceptance",
        shipper: rejectingShipperId,
      },
      {
        shipper: null,
        status: "in_transit",
        $push: {
          statusHistory: {
            status: "in_transit",
            timestamp: new Date(),
            note: `Delivery rejected by shipper ${req.user.username}. Re-assigning to another shipper.`,
          },
        },
      },
      { new: true },
    );

    if (order) {
      // Reset shipper status về available
      await User.findByIdAndUpdate(rejectingShipperId, {
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
      });

      // Notify shipper so frontend can refresh status
      notificationService.sendNotification({
        recipientId: rejectingShipperId,
        type: "shipper_status_updated",
        title: "You are now available",
        body: "Order declined. You are available to accept new orders.",
        link: `/shipper/available`,
        metadata: {},
      }).catch(() => {});

      // Tìm ngay shipper khác ở cùng thành phố
      setImmediate(() => autoAssignDeliveryShipper(order, rejectingShipperId).catch(() => {}));

      return res.json({ ok: true, message: "Delivery rejected. Reassigning to another shipper." });
    }

    return res.status(404).json({ message: "Order not found or cannot be rejected" });
  } catch (err) {
    next(err);
  }
};

exports.markDelivered = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [
        { shipper: req.user._id, status: "shipping" },     // Shipper 1 không có relay (same area)
        { shipper: req.user._id, status: "delivering" },   // Shipper 2 giao hàng
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

    // Kiểm tra còn đơn active không; nếu không thì set available
    setImmediate(async () => {
      try {
        const activeCount = await Order.countDocuments({
          $or: [
            { shipper: req.user._id, status: { $in: ["shipping", "pending_acceptance", "delivering", "pending_delivery_acceptance"] } },
            { returnShipper: req.user._id, status: "return_shipping" },
          ],
        });
        if (activeCount === 0) {
          await User.findByIdAndUpdate(req.user._id, {
            "shipperInfo.shipperStatus": "available",
            "shipperInfo.isAvailable": true,
          });
        }
        // Thử dispatch cả 2 loại queue
        await dispatchNextFromQueue(req.user._id);
        await dispatchNextDeliveryFromQueue(req.user._id);
      } catch (e) { /* ignore */ }
    });

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

/**
 * Shipper 1 báo đã đến khu vực buyer → bàn giao cho Shipper 2.
 * Shipper 1 được ghi vào pickupShipper, shipper field reset để Shipper 2 nhận.
 * Sau đó tự động assign Shipper 2 hoặc đưa vào delivery_queued.
 */
exports.arrivedAtDestination = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      shipper: req.user._id,
      status: "shipping",
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found or not in shipping status" });
    }

    // Ghi lại Shipper 1, reset shipper field để Shipper 2 có thể nhận
    order.pickupShipper = req.user._id;
    order.shipper = null;
    order.status = "in_transit";
    order.statusHistory.push({
      status: "in_transit",
      timestamp: new Date(),
      note: `Shipper ${req.user.username} arrived at buyer area. Handoff to local delivery shipper.`,
    });
    await order.save();

    // Cập nhật Shipper 1: giải phóng slot
    setImmediate(async () => {
      try {
        const activeCount = await Order.countDocuments({
          $or: [
            { shipper: req.user._id, status: { $in: ["shipping", "pending_acceptance", "delivering", "pending_delivery_acceptance"] } },
            { returnShipper: req.user._id, status: "return_shipping" },
          ],
        });
        if (activeCount === 0) {
          await User.findByIdAndUpdate(req.user._id, {
            "shipperInfo.shipperStatus": "available",
            "shipperInfo.isAvailable": true,
          });
        }
        // Dispatch đơn tiếp từ queue cho Shipper 1
        await dispatchNextFromQueue(req.user._id);
        // Assign Shipper 2 cho đơn này
        await autoAssignDeliveryShipper(order, req.user._id);
      } catch (e) { /* ignore */ }
    });

    // Notify buyer
    notificationService
      .sendNotification({
        recipientId: order.buyer,
        type: "order_in_transit",
        title: "Your order is almost there!",
        body: `The package has arrived in your area and is being assigned to a local delivery shipper.`,
        link: `/purchases/${order._id}`,
        metadata: { orderId: order._id },
      })
      .catch(() => { });

    // Notify seller
    notificationService
      .sendNotification({
        recipientId: order.seller,
        type: "order_in_transit",
        title: "Order in transit",
        body: `Shipper ${req.user.username} has arrived at the buyer's area. Awaiting local delivery shipper.`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      })
      .catch(() => { });

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
          { shipper: shipperId, status: { $in: ["shipping", "delivering"] } },
          { returnShipper: shipperId, status: "return_shipping" }
        ]
      }),
      Order.countDocuments({
        $or: [
          { shipper: shipperId },
          { pickupShipper: shipperId },
          { returnShipper: shipperId }
        ]
      }),
      Order.countDocuments({
        $or: [
          { status: "queued", shipper: null },
          { status: "delivery_queued", shipper: null },
        ]
      }),
    ]);

    // Load shipper limits
    const shipperDoc = await User.findById(shipperId)
      .select("shipperInfo")
      .lean();
    const maxOrders = shipperDoc?.shipperInfo?.maxOrders ?? 3;
    const isAvailable = shipperDoc?.shipperInfo?.isAvailable ?? true;
    const shipperStatus = shipperDoc?.shipperInfo?.shipperStatus ?? "available";
    const assignedProvince = shipperDoc?.shipperInfo?.assignedProvince ?? "";

    res.json({
      delivered,
      inTransit,
      totalAccepted,
      queuedOrders: queued,
      maxOrders,
      isAvailable,
      shipperStatus,
      assignedProvince,
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
      shipperStatus: shipper.shipperInfo.shipperStatus,
      maxOrders: shipper.shipperInfo.maxOrders,
    });
  } catch (err) {
    next(err);
  }
};

exports.resumeShipper = async (req, res, next) => {
  try {
    const shipperDoc = await User.findById(req.user._id).select("shipperInfo");
    if (!shipperDoc) return res.status(404).json({ message: "Shipper not found" });

    shipperDoc.shipperInfo.shipperStatus = "available";
    shipperDoc.shipperInfo.isAvailable = true;
    await shipperDoc.save();

    // Trigger dispatch từ queue nếu có đơn chờ
    setImmediate(() => dispatchNextFromQueue(req.user._id).catch(() => {}));

    res.json({ ok: true, shipperStatus: "available" });
  } catch (err) {
    next(err);
  }
};
