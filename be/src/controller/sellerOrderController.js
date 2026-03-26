const Order = require("../models/Order");
const OrderGroup = require("../models/OrderGroup");
const Revenue = require("../models/Revenue");
const Product = require("../models/Product");
const User = require("../models/User");
const mongoose = require("mongoose");
// Trust Score trigger (non-blocking, fire-and-forget)
const { evaluateSellerTrust } = require("../services/sellerTrustService");
const sendEmail = require("../utils/sendEmail");
const notificationService = require("../services/notificationService");
const { autoAssignOrder } = require("../services/orderDispatchService");

/**
 * Update order status
 * PATCH /api/orders/:id/status
 * Body:
 *   { status: "processing" | "shipped" | "delivered" | "cancelled" | "returned",
 *     note?: string,                 // free-text note (seller or auto for buyer)
 *     reason?: string,               // buyer cancellation code (see list below)
 *     otherReason?: string           // when reason === "other", custom explanation
 *   }
 *
 * When a buyer cancels, `reason` is required and mapped to a human-readable
 * note. Sellers must provide `note` when cancelling.
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "cancelled") {
      const buyerCanCancelStatus = ["created", "packaging"];
      const sellerCanCancelStatus = [
        "created",
        "packaging",
        "ready_to_ship",
        "cancel_requested",
      ];

      const isBuyer = order.buyer.toString() === userId.toString();
      const isSeller = order.seller.toString() === userId.toString();

      if (isBuyer) {
        // Buyer cancelling: validate status then return early (skip seller-only guard below)
        if (!buyerCanCancelStatus.includes(order.status)) {
          return res.status(400).json({
            message:
              "You can only cancel order when it is created or packaging",
          });
        }
        const buyerReasons = [
          "changed_mind",
          "ordered_by_mistake",
          "wrong_quantity",
          "found_better_price",
          "payment_issue",
          "delivery_too_long",
          "seller_not_responding",
          "want_change_address",
          "want_change_product",
          "other",
        ];
        const { reason, otherReason } = req.body;
        if (!reason || typeof reason !== "string") {
          return res.status(400).json({
            message: "Cancellation reason is required",
          });
        }
        if (!buyerReasons.includes(reason)) {
          return res.status(400).json({
            message: "Invalid cancellation reason",
          });
        }
        // compute note text
        if (reason === "other") {
          if (!otherReason || !otherReason.toString().trim()) {
            return res.status(400).json({
              message: "Please provide details for 'other' reason",
            });
          }
          req.body.note = otherReason.toString().trim();
        } else {
          // map code to human-readable text
          const reasonLabels = {
            changed_mind: "Changed mind",
            ordered_by_mistake: "Ordered by mistake",
            wrong_quantity: "Wrong quantity",
            found_better_price: "Found better price",
            payment_issue: "Payment issue",
            delivery_too_long: "Delivery too long",
            seller_not_responding: "Seller not responding",
            want_change_address: "Want to change address",
            want_change_product: "Want to change product",
          };
          req.body.note = reasonLabels[reason] || reason;
        }
      } else if (isSeller) {
        // Seller cancelling: validate status
        if (!sellerCanCancelStatus.includes(order.status)) {
          return res.status(400).json({
            message: "Seller cannot cancel at this stage",
          });
        }
        // seller must provide reason
        if (!note || !note.toString().trim()) {
          return res.status(400).json({
            message: "Cancellation reason is required",
          });
        }
      } else {
        return res.status(403).json({
          message: "Unauthorized",
        });
      }

      // If buyer is cancelling, handle the cancellation/request here and return
      if (isBuyer) {
        if (order.status === "created") {
          // Immediate cancellation for 'created' status
          for (const item of order.items) {
            const Product = require("../models/Product");
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { stock: item.quantity, quantity: item.quantity },
            });
          }

          order.status = "cancelled";
          order.statusHistory.push({
            status: "cancelled",
            timestamp: new Date(),
            note: req.body.note || "Cancelled by buyer",
          });

          order.updatedAt = new Date();
          await order.save();

          const updated = await Order.findById(id)
            .populate("buyer", "username email")
            .populate("seller", "username email")
            .populate("items.productId", "title price image images")
            .lean();

          // Notify seller of immediate cancellation
          notificationService
            .sendNotification({
              recipientId: updated.seller._id,
              type: "order_cancelled",
              title: "Order Cancelled",
              body: `Buyer has cancelled order #${updated._id}`,
              link: `/seller/orders/${updated._id}`,
              metadata: { orderId: updated._id },
            })
            .catch(() => {});

          // Send email to seller
          if (updated.seller && updated.seller.email) {
            sendEmail({
              to: updated.seller.email,
              subject: `Order Cancelled - #${updated._id}`,
              template: "sellerOrderCancelNotification.ejs",
              data: {
                username: updated.seller.username,
                orderId: updated._id,
                status: "cancelled",
                statusMessage:
                  "This order was cancelled by the buyer immediately.",
                note: req.body.note || "Cancelled by buyer",
                orderUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/seller/orders/${updated._id}`,
              },
            }).catch((err) =>
              console.error("[SellerCancelEmail] send failed:", err.message),
            );
          }

          return res.json({
            message: "Order cancelled successfully",
            data: updated,
          });
        } else if (order.status === "packaging") {
          // Request cancellation for 'packaging' status
          order.status = "cancel_requested";
          order.statusHistory.push({
            status: "cancel_requested",
            timestamp: new Date(),
            note: req.body.note || "Cancellation requested by buyer",
          });

          order.updatedAt = new Date();
          await order.save();

          const updated = await Order.findById(id)
            .populate("buyer", "username email")
            .populate("seller", "username email")
            .populate("items.productId", "title price image images")
            .lean();

          // Notify seller of cancel request
          notificationService
            .sendNotification({
              recipientId: updated.seller._id,
              type: "cancel_requested",
              title: "Cancellation Request",
              body: `Buyer has requested to cancel order #${updated._id}`,
              link: `/seller/orders/${updated._id}`,
              metadata: { orderId: updated._id },
            })
            .catch(() => {});

          // Send email to seller of cancel request
          if (updated.seller && updated.seller.email) {
            sendEmail({
              to: updated.seller.email,
              subject: `Cancellation Request - #${updated._id}`,
              template: "sellerOrderCancelNotification.ejs",
              data: {
                username: updated.seller.username,
                orderId: updated._id,
                status: "cancel_requested",
                statusMessage:
                  "The buyer has requested to cancel this order. Please approve or reject it in the seller panel.",
                note: req.body.note || "Cancellation requested by buyer",
                orderUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/seller/orders/${updated._id}`,
              },
            }).catch((err) =>
              console.error(
                "[SellerCancelRequestEmail] send failed:",
                err.message,
              ),
            );
          }

          return res.json({
            message: "Cancellation request sent to seller",
            data: updated,
          });
        }
      }
    }

    // Only seller can update order status (non-cancel paths)
    if (order.seller.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the seller can update order status",
      });
    }

    const validStatuses = [
      "created",
      "packaging",
      "ready_to_ship",
      "shipping",
      "delivered",
      "completed",
      "cancelled",
      "cancel_requested",
      "failed",
      "returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const previousStatus = order.status;

    // Guard: If status is cancel_requested, seller must either approve (cancelled) or reject (packaging)
    if (previousStatus === "cancel_requested") {
      if (status !== "cancelled" && status !== "packaging") {
        return res.status(400).json({
          message: "Please approve or reject the cancellation request first.",
        });
      }
      if (!note || !note.trim()) {
        return res.status(400).json({
          message:
            "A reason is required when approving or rejecting a cancellation request.",
        });
      }
    }

    if (
      (status === "cancelled" || status === "returned") &&
      previousStatus !== "cancelled" &&
      previousStatus !== "returned"
    ) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity },
        });
      }
    }

    const isNowCompleted =
      status === "completed" && previousStatus !== "completed";
      
    const isNowReturned = 
      status === "returned" && previousStatus !== "returned";

    // Update status
    order.status = status;
    order.updatedAt = new Date();

    if (status === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    // Store seller's city for pickup shipper routing
    if (status === "ready_to_ship" && !order.sellerCity) {
      const sellerDoc = await User.findById(order.seller).select("sellerInfo.shopAddress").lean();
      order.sellerCity = sellerDoc?.sellerInfo?.shopAddress || order.shippingAddress?.city || "";
    }

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || "",
    });

    await order.save();

    // Process revenue and payment status centrally
    if (isNowCompleted) {
      const revenueService = require("../services/revenueService");
      await revenueService.processOrderCompletion(order._id);
    }

    // Revert revenue if it's returned
    if (isNowReturned) {
      const revenueService = require("../services/revenueService");
      await revenueService.revertOrderRevenue(order._id);
    }

    // Nếu seller set ready_to_ship, thử auto-assign cho shipper (fire-and-forget)
    if (status === "ready_to_ship") {
      setImmediate(() => autoAssignOrder(order).catch(() => {}));
    }

    // ── Trigger Trust Score recalc (fire-and-forget, không block response) ──
    if (
      status === "delivered" ||
      status === "returned" ||
      status === "cancelled"
    ) {
      setImmediate(() => {
        evaluateSellerTrust(
          order.seller,
          status === "delivered" ? "ORDER_DELIVERED" : "REFUND_CREATED",
        ).catch((err) =>
          console.warn("[TrustScore] recalc warn:", err.message),
        );
      });
    }

    const updated = await Order.findById(id)
      .populate("buyer", "username email")
      .populate("seller", "username")
      .populate("items.productId", "title price image images")
      .lean();

    // In-app notification to buyer (fire-and-forget)
    if (updated && updated.buyer) {
      const productNames = (updated.items || [])
        .map((item) => item.productId?.title || item.title || "Product")
        .filter(Boolean);
      const productLabel =
        productNames.length === 1
          ? productNames[0]
          : productNames.length > 1
            ? `${productNames[0]} and ${productNames.length - 1} more`
            : "your order";

      const statusLabels = {
        created: `Your order for "${productLabel}" has been placed`,
        packaging: `"${productLabel}" is being packaged`,
        ready_to_ship: `"${productLabel}" is ready to ship`,
        shipping: `"${productLabel}" is on the way`,
        delivered: `"${productLabel}" has been delivered`,
        completed: `Order for "${productLabel}" completed`,
        cancelled: `Order for "${productLabel}" cancelled`,
        cancel_requested: `Cancellation requested for "${productLabel}"`,
        failed: `Order for "${productLabel}" failed`,
        returned: `Order for "${productLabel}" returned`,
      };
      const notificationBody = `Status: ${status.replace(/_/g, " ")}${
        note ? `\nReason: ${note}` : ""
      }`;
      notificationService
        .sendNotification({
          recipientId: updated.buyer._id,
          type: "order_status_changed",
          title: statusLabels[status] || `Order status: ${status}`,
          body: notificationBody,
          link: `/purchases/${updated._id}`,
          metadata: { orderId: updated._id, status, note },
        })
        .catch(() => {});
    }

    // Send email to buyer asynchronously (fire-and-forget)
    if (updated && updated.buyer && updated.buyer.email) {
      setImmediate(() => {
        const statusMessages = {
          created: "Your order has been created and is waiting for processing.",
          packaging: "The seller is currently packaging your items.",
          cancel_requested:
            "Your cancel request has been sent to the seller. Please wait for the seller to response.",
          ready_to_ship:
            "Your order is packed and waiting for the shipping carrier.",
          shipping:
            "Your order is on the way! It has been handed over to the shipping carrier.",
          delivered:
            "Your order has been successfully delivered. We hope you enjoy it!",
          completed: "Your order is marked as completed.",
          cancelled: "Your order has been cancelled.",
          failed:
            "There was an issue fulfilling your order. It has been marked as failed.",
          returned: "Your order has been returned.",
        };
        const statusMessage =
          statusMessages[status] ||
          `Your order status has changed to ${status.replace(/_/g, " ")}.`;

        sendEmail({
          to: updated.buyer.email,
          subject: `Order Status Updated - #${updated._id}`,
          template: "orderStatusUpdate.ejs",
          data: {
            username: updated.buyer.username,
            orderId: updated._id,
            status: status,
            statusMessage: statusMessage,
            note: note || "",
            orderUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/purchases/${updated._id}`,
          },
        }).catch((err) =>
          console.error(
            "[OrderStatusEmail] send notification failed:",
            err.message,
          ),
        );
      });
    }

    return res.json({
      message: `Order status updated to ${status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add/update tracking number
 * PATCH /api/orders/:id/tracking
 * Body: { trackingNumber: string, estimatedDelivery?: Date }
 */
exports.addTrackingNumber = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingNumber, estimatedDelivery } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    if (!trackingNumber) {
      return res.status(400).json({ message: "Tracking number is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only seller can add tracking
    if (order.seller.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the seller can add tracking information",
      });
    }

    order.trackingNumber = trackingNumber;
    if (estimatedDelivery) {
      order.estimatedDelivery = new Date(estimatedDelivery);
    }
    order.updatedAt = new Date();

    await order.save();

    return res.json({
      message: "Tracking number added successfully",
      data: {
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get order status history
 * GET /api/orders/:id/history
 */
exports.getStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(id)
      .select("statusHistory buyer seller")
      .lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Buyer, seller, or admin can view
    const isBuyer = order.buyer.toString() === userId.toString();
    const isSeller = order.seller.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json({ data: order.statusHistory || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * Update shipping address
 * PATCH /api/orders/:id/shipping-address
 * Body: { street, city, state, zipCode, country }
 */
exports.updateShippingAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { street, city, state, zipCode, country } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only buyer can update shipping address, and only before it's shipped
    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the buyer can update shipping address",
      });
    }

    if (["shipped", "delivered"].includes(order.status)) {
      return res.status(400).json({
        message: "Cannot update shipping address after order has been shipped",
      });
    }

    order.shippingAddress = {
      street: street || order.shippingAddress?.street || "",
      city: city || order.shippingAddress?.city || "",
      state: state || order.shippingAddress?.state || "",
      zipCode: zipCode || order.shippingAddress?.zipCode || "",
      country: country || order.shippingAddress?.country || "",
    };
    order.updatedAt = new Date();

    await order.save();

    return res.json({
      message: "Shipping address updated successfully",
      data: order.shippingAddress,
    });
  } catch (err) {
    next(err);
  }
};
