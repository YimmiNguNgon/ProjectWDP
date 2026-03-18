const Order = require("../models/Order");
const DeliveryDispute = require("../models/DeliveryDispute");
const notificationService = require("../services/notificationService");

// ─── Buyer confirms received (trực tiếp từ delivered) ────────────────────────
exports.confirmReceived = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, buyer: req.user._id, status: "delivered" },
      {
        $set: { status: "completed", paymentStatus: "paid" },
        $push: {
          statusHistory: {
            status: "completed",
            timestamp: new Date(),
            note: "Buyer confirmed receipt",
          },
        },
      },
      { new: true },
    );

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or not eligible for confirmation" });
    }

    notificationService
      .sendNotification({
        recipientId: order.seller,
        type: "order_completed",
        title: "Order completed",
        body: `Buyer confirmed receipt of order #${order._id.toString().slice(-8).toUpperCase()}`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      })
      .catch(() => {});

    // Process revenue and payment status centrally
    const revenueService = require("../services/revenueService");
    await revenueService.processOrderCompletion(order._id);

    res.json({ ok: true, order });
  } catch (err) {
    next(err);
  }
};

// ─── Buyer báo không nhận được hàng → tạo dispute ───────────────────────────
exports.reportNotReceived = async (req, res, next) => {
  try {
    const { buyerNote, skipToAdmin } = req.body;
    const order = await Order.findOne({
      _id: req.params.orderId,
      buyer: req.user._id,
      status: "delivered",
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found or not delivered" });
    }

    const existing = await DeliveryDispute.findOne({
      order: order._id,
      status: { $in: ["PENDING_SHIPPER", "SHIPPER_RESPONDED", "REPORTED_TO_ADMIN"] },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "A dispute already exists for this order", data: existing });
    }

    // Nếu không có shipper hoặc buyer chọn skipToAdmin → thẳng lên admin
    const hasShipper = !!order.shipper;
    const goToAdmin = !hasShipper || !!skipToAdmin;
    const initialStatus = goToAdmin ? "REPORTED_TO_ADMIN" : "PENDING_SHIPPER";

    const dispute = await DeliveryDispute.create({
      order: order._id,
      buyer: req.user._id,
      shipper: order.shipper || null,
      buyerNote: buyerNote || "",
      status: initialStatus,
    });

    if (hasShipper && !skipToAdmin) {
      notificationService
        .sendNotification({
          recipientId: order.shipper,
          type: "delivery_dispute_new",
          title: "Non-receipt report",
          body: `Buyer reports not receiving order #${order._id.toString().slice(-8).toUpperCase()}. Please respond.`,
          link: `/shipper/disputes`,
          metadata: { disputeId: dispute._id, orderId: order._id },
        })
        .catch(() => {});
    } else {
      // Không có shipper hoặc buyer chọn report thẳng lên admin
      const User = require("../models/User");
      const admins = await User.find({ role: "admin" }).select("_id").lean();
      const title = skipToAdmin
        ? "Buyer reported non-receipt directly to admin"
        : "Buyer reported non-receipt (no shipper assigned)";
      for (const admin of admins) {
        notificationService
          .sendNotification({
            recipientId: admin._id,
            type: "delivery_dispute_admin",
            title,
            body: `Order #${order._id.toString().slice(-8).toUpperCase()} — admin review required.`,
            link: `/admin/delivery-reports`,
            metadata: { disputeId: dispute._id, orderId: order._id },
          })
          .catch(() => {});
      }
    }

    res.status(201).json({ ok: true, dispute });
  } catch (err) {
    next(err);
  }
};

// ─── Lấy dispute theo orderId ─────────────────────────────────────────────────
exports.getDisputeByOrder = async (req, res, next) => {
  try {
    const dispute = await DeliveryDispute.findOne({ order: req.params.orderId })
      .populate("shipper", "username")
      .populate("buyer", "username")
      .lean();

    res.json({ dispute: dispute || null });
  } catch (err) {
    next(err);
  }
};

// ─── Shipper: xem danh sách dispute (ẩn REPORTED_TO_ADMIN) ──────────────────
exports.getShipperDisputes = async (req, res, next) => {
  try {
    const filter = {
      shipper: req.user._id,
      status: { $ne: "REPORTED_TO_ADMIN" }, // shipper không thấy escalated disputes
    };
    if (req.query.status) filter.status = req.query.status;

    const disputes = await DeliveryDispute.find(filter)
      .populate("buyer", "username email")
      .populate({
        path: "order",
        select: "totalAmount createdAt shippingAddress items",
        populate: { path: "items.productId", select: "title images" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ disputes });
  } catch (err) {
    next(err);
  }
};

// ─── Shipper: phản hồi dispute với note + ảnh ────────────────────────────────
exports.shipperRespond = async (req, res, next) => {
  try {
    const { shipperNote, shipperImages } = req.body;

    if (!shipperNote) {
      return res.status(400).json({ message: "Note is required" });
    }

    const dispute = await DeliveryDispute.findOneAndUpdate(
      { _id: req.params.id, shipper: req.user._id, status: "PENDING_SHIPPER" },
      {
        status: "SHIPPER_RESPONDED",
        shipperNote: shipperNote || "",
        shipperImages: Array.isArray(shipperImages) ? shipperImages.slice(0, 5) : [],
      },
      { new: true },
    );

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found or already responded" });
    }

    notificationService
      .sendNotification({
        recipientId: dispute.buyer,
        type: "delivery_dispute_responded",
        title: "Shipper responded to your report",
        body: "The shipper has responded to your non-receipt report. Please review and confirm.",
        link: `/purchases/${dispute.order}`,
        metadata: { disputeId: dispute._id },
      })
      .catch(() => {});

    res.json({ ok: true, dispute });
  } catch (err) {
    next(err);
  }
};

// ─── Buyer: xác nhận nhận được hàng sau shipper hoặc admin phản hồi ──────────
exports.buyerConfirmAfterDispute = async (req, res, next) => {
  try {
    // Chấp nhận cả 2 trạng thái: sau shipper respond hoặc sau admin notify
    const dispute = await DeliveryDispute.findOneAndUpdate(
      {
        _id: req.params.id,
        buyer: req.user._id,
        status: { $in: ["SHIPPER_RESPONDED", "REPORTED_TO_ADMIN"] },
      },
      { status: "CONFIRMED" },
      { new: true },
    );

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found or not in correct state" });
    }

    await Order.findByIdAndUpdate(dispute.order, {
      $set: { status: "completed", paymentStatus: "paid" },
      $push: {
        statusHistory: {
          status: "completed",
          timestamp: new Date(),
          note: "Buyer confirmed receipt after delivery dispute",
        },
      },
    });

    // Process revenue and payment status centrally
    const revenueService = require("../services/revenueService");
    await revenueService.processOrderCompletion(dispute.order);

    res.json({ ok: true, dispute });
  } catch (err) {
    next(err);
  }
};

// ─── Buyer: báo cáo lên admin sau khi shipper đã phản hồi ───────────────────
exports.buyerReportToAdmin = async (req, res, next) => {
  try {
    const dispute = await DeliveryDispute.findOneAndUpdate(
      { _id: req.params.id, buyer: req.user._id, status: { $in: ["PENDING_SHIPPER", "SHIPPER_RESPONDED"] } },
      { status: "REPORTED_TO_ADMIN" },
      { new: true },
    );

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found or not in correct state" });
    }

    // Gửi thông báo đến tất cả admin (tìm admin users)
    const User = require("../models/User");
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    for (const admin of admins) {
      notificationService
        .sendNotification({
          recipientId: admin._id,
          type: "delivery_dispute_admin",
          title: "Buyer escalated non-receipt dispute",
          body: `Buyer has not received order #${dispute.order.toString().slice(-8).toUpperCase()} and is requesting admin intervention.`,
          link: `/admin/delivery-reports`,
          metadata: { disputeId: dispute._id },
        })
        .catch(() => {});
    }

    res.json({ ok: true, dispute });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: lấy danh sách tất cả dispute ─────────────────────────────────────
exports.adminGetDisputes = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [disputes, total] = await Promise.all([
      DeliveryDispute.find(filter)
        .populate("buyer", "username email")
        .populate("shipper", "username email")
        .populate({
          path: "order",
          select: "totalAmount createdAt shippingAddress status",
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryDispute.countDocuments(filter),
    ]);

    res.json({ disputes, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: gửi thông báo lại cho buyer ──────────────────────────────────────
exports.adminNotifyBuyer = async (req, res, next) => {
  try {
    const { adminNote } = req.body;

    if (!adminNote) {
      return res.status(400).json({ message: "Admin note is required" });
    }

    const dispute = await DeliveryDispute.findOneAndUpdate(
      { _id: req.params.id, status: "REPORTED_TO_ADMIN" },
      { adminNote, adminNotifiedAt: new Date() },
      { new: true },
    );

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found or not reported to admin" });
    }

    // Gửi thông báo cho buyer
    notificationService
      .sendNotification({
        recipientId: dispute.buyer,
        type: "delivery_dispute_admin_replied",
        title: "Admin responded to your delivery report",
        body: adminNote,
        link: `/purchases/${dispute.order}`,
        metadata: { disputeId: dispute._id, orderId: dispute.order },
      })
      .catch(() => {});

    res.json({ ok: true, dispute });
  } catch (err) {
    next(err);
  }
};
