const cron = require("node-cron");
const Order = require("../models/Order");
const DeliveryDispute = require("../models/DeliveryDispute");
const notificationService = require("../services/notificationService");
const { autoAssignOrder } = require("../services/orderDispatchService");

const TIMEOUT_MINUTES = 5;
const SHIPPING_TIMEOUT_MINUTES = 5;
const DELIVERED_AUTO_COMPLETE_MINUTES = 5;

const notify = (payload) => notificationService.sendNotification(payload).catch(() => {});

async function expirePendingAcceptance() {
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "pending_acceptance",
    updatedAt: { $lt: cutoff },
  }).select("_id shipper seller buyer").lean();

  if (!expiredOrders.length) return;

  console.log(`[ShipperAcceptance] Found ${expiredOrders.length} expired pending order(s)`);

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const reset = await Order.findOneAndUpdate(
      { _id: order._id, status: "pending_acceptance" },
      {
        shipper: null,
        status: "ready_to_ship",
        $push: {
          statusHistory: {
            status: "ready_to_ship",
            timestamp: new Date(),
            note: `Shipper did not respond within ${TIMEOUT_MINUTES} minutes. Returned to pool.`,
          },
        },
      },
      { new: true },
    );

    if (reset) {
      console.log(`[ShipperAcceptance] Order ${order._id} returned to pool, retrying assign...`);

      // Thông báo shipper bị hủy assignment
      if (order.shipper) {
        notify({
          recipientId: order.shipper,
          type: "order_unassigned",
          title: "Order assignment cancelled",
          body: `Order #${shortId} was unassigned because you did not respond within ${TIMEOUT_MINUTES} minutes.`,
          link: `/shipper/available`,
          metadata: { orderId: order._id },
        });
      }

      // Thông báo seller đơn đang tìm shipper mới
      if (order.seller) {
        notify({
          recipientId: order.seller,
          type: "order_reassigning",
          title: "Finding a new shipper",
          body: `Order #${shortId} shipper did not respond. The system is reassigning a new shipper.`,
          link: `/seller/orders`,
          metadata: { orderId: order._id },
        });
      }

      setImmediate(() => autoAssignOrder(reset).catch(() => {}));
    }
  }
}

async function expireShippingOrders() {
  const cutoff = new Date(Date.now() - SHIPPING_TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "shipping",
    updatedAt: { $lt: cutoff },
  }).select("_id shipper seller buyer").lean();

  if (!expiredOrders.length) return;

  console.log(`[ShipperShipping] Found ${expiredOrders.length} expired shipping order(s)`);

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const reset = await Order.findOneAndUpdate(
      { _id: order._id, status: "shipping" },
      {
        shipper: null,
        status: "ready_to_ship",
        $push: {
          statusHistory: {
            status: "ready_to_ship",
            timestamp: new Date(),
            note: `Shipper did not mark delivered within ${SHIPPING_TIMEOUT_MINUTES} minutes. Reassigning.`,
          },
        },
      },
      { new: true },
    );

    if (reset) {
      console.log(`[ShipperShipping] Order ${order._id} unassigned, returned to pool`);

      // Thông báo shipper bị hủy vì không mark delivered
      if (order.shipper) {
        notify({
          recipientId: order.shipper,
          type: "order_unassigned",
          title: "Order unassigned — delivery timeout",
          body: `Order #${shortId} was unassigned because you did not mark it as delivered within ${SHIPPING_TIMEOUT_MINUTES} minutes.`,
          link: `/shipper/available`,
          metadata: { orderId: order._id },
        });
      }

      // Thông báo seller đơn đang tìm shipper mới
      if (order.seller) {
        notify({
          recipientId: order.seller,
          type: "order_reassigning",
          title: "Finding a new shipper",
          body: `Order #${shortId} shipper did not confirm delivery. The system is reassigning a new shipper.`,
          link: `/seller/orders`,
          metadata: { orderId: order._id },
        });
      }

      setImmediate(() => autoAssignOrder(reset).catch(() => {}));
    }
  }
}

async function autoCompleteDeliveredOrders() {
  const cutoff = new Date(Date.now() - DELIVERED_AUTO_COMPLETE_MINUTES * 60 * 1000);

  const deliveredOrders = await Order.find({
    status: "delivered",
    updatedAt: { $lt: cutoff },
  }).select("_id seller buyer").lean();

  if (!deliveredOrders.length) return;

  console.log(`[AutoComplete] Found ${deliveredOrders.length} delivered order(s) to check`);

  for (const order of deliveredOrders) {
    // Kiểm tra không có dispute đang mở
    const dispute = await DeliveryDispute.findOne({
      order: order._id,
      status: { $in: ["PENDING_SHIPPER", "SHIPPER_RESPONDED", "REPORTED_TO_ADMIN"] },
    }).lean();

    if (dispute) continue; // Đang có tranh chấp → không tự complete

    const shortId = order._id.toString().slice(-8).toUpperCase();
    const completed = await Order.findOneAndUpdate(
      { _id: order._id, status: "delivered" },
      {
        $set: { status: "completed" },
        $push: {
          statusHistory: {
            status: "completed",
            timestamp: new Date(),
            note: `Auto-completed after ${DELIVERED_AUTO_COMPLETE_MINUTES} minutes with no report from buyer.`,
          },
        },
      },
      { new: true },
    );

    if (completed) {
      console.log(`[AutoComplete] Order ${order._id} auto-completed`);

      // Thông báo seller
      if (order.seller) {
        notify({
          recipientId: order.seller,
          type: "order_completed",
          title: "Order auto-completed",
          body: `Order #${shortId} was automatically completed as buyer did not report any issues.`,
          link: `/seller/orders`,
          metadata: { orderId: order._id },
        });
      }

      // Thông báo buyer
      if (order.buyer) {
        notify({
          recipientId: order.buyer,
          type: "order_completed",
          title: "Order completed",
          body: `Order #${shortId} has been automatically marked as completed. Thank you for your purchase!`,
          link: `/purchases/${order._id}`,
          metadata: { orderId: order._id },
        });
      }
    }
  }
}

function initShipperAcceptanceJob() {
  cron.schedule("* * * * *", async () => {
    try {
      await expirePendingAcceptance();
      await expireShippingOrders();
      await autoCompleteDeliveredOrders();
    } catch (err) {
      console.error("[ShipperJob] Error:", err.message);
    }
  });

  console.log(`✅ Shipper acceptance timeout job initialized (${TIMEOUT_MINUTES}min timeout, runs every minute)`);
}

module.exports = { initShipperAcceptanceJob, expirePendingAcceptance, expireShippingOrders, autoCompleteDeliveredOrders };
