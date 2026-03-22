const cron = require("node-cron");
const Order = require("../models/Order");
const OrderGroup = require("../models/OrderGroup");
const Product = require("../models/Product");
const Revenue = require("../models/Revenue");
const User = require("../models/User");
const DeliveryDispute = require("../models/DeliveryDispute");
const notificationService = require("../services/notificationService");
const { autoAssignOrder } = require("../services/orderDispatchService");

const SELLER_CONFIRM_TIMEOUT_MINUTES = 5;
const TIMEOUT_MINUTES = 5;
const SHIPPING_TIMEOUT_MINUTES = 5;
const DELIVERED_AUTO_COMPLETE_MINUTES = 5;
const READY_TO_SHIP_REASSIGN_MINUTES = 5;

const notify = (payload) =>
  notificationService.sendNotification(payload).catch((err) => {
    console.error("[ShipperJob] Notification failed:", err.message);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Deactivate shipper: set isAvailable = false và gửi thông báo
// ─────────────────────────────────────────────────────────────────────────────
async function deactivateShipper(shipperId, shortOrderId, reason) {
  try {
    const result = await User.findByIdAndUpdate(
      shipperId,
      { "shipperInfo.shipperStatus": "paused", "shipperInfo.isAvailable": false },
      { new: true }
    );
    if (result) {
      console.log(
        `[ShipperJob] Shipper ${shipperId} paused. Reason: ${reason}`
      );
    } else {
      console.warn(`[ShipperJob] Could not find shipper ${shipperId} to deactivate.`);
    }
  } catch (err) {
    console.error(`[ShipperJob] Failed to deactivate shipper ${shipperId}:`, err.message);
  }

  await notify({
    recipientId: shipperId,
    type: "shipper_deactivated",
    title: "You have been removed from the delivery rotation",
    body: `${reason} Order #${shortOrderId}. Your account has been set to unavailable. Please re-enable availability from the shipper dashboard when you are ready to receive orders again.`,
    link: `/shipper/dashboard`,
    metadata: { reason },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 0: Seller không mark packaging trong SELLER_CONFIRM_TIMEOUT_MINUTES phút
// ─────────────────────────────────────────────────────────────────────────────
async function expireNewOrders() {
  const cutoff = new Date(Date.now() - SELLER_CONFIRM_TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "created",
    createdAt: { $lt: cutoff },
  })
    .select("_id seller buyer orderGroup items paymentStatus")
    .lean();

  if (!expiredOrders.length) return;

  console.log(`[SellerConfirm] Found ${expiredOrders.length} unconfirmed order(s)`);

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();

    // 1. Cancel đơn
    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, status: "created" },
      {
        $set: { status: "cancelled", paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus },
        $push: {
          statusHistory: {
            status: "cancelled",
            timestamp: new Date(),
            note: `Auto-cancelled: seller did not confirm order within ${SELLER_CONFIRM_TIMEOUT_MINUTES} minutes.`,
          },
        },
      },
      { new: true }
    );

    if (!cancelled) {
      console.log(`[SellerConfirm] Order ${order._id} already processed, skipping.`);
      continue;
    }

    console.log(`[SellerConfirm] Order ${order._id} cancelled (seller timeout).`);

    // 2. Hoàn lại stock sản phẩm
    for (const item of order.items || []) {
      if (item.productId && item.quantity) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity, quantity: item.quantity },
        }).catch(() => {});
      }
    }

    // 3. Xóa revenue records liên quan (chưa hoàn tiền thực tế nên xóa luôn)
    await Revenue.deleteMany({ order: order._id }).catch(() => {});

    // 4. Cập nhật OrderGroup nếu có
    if (order.orderGroup) {
      await OrderGroup.findByIdAndUpdate(order.orderGroup, {
        $set: { status: "cancelled" },
      }).catch(() => {});
    }

    // 5. Notify seller
    if (order.seller) {
      await notify({
        recipientId: order.seller,
        type: "order_cancelled",
        title: "Order auto-cancelled — no response",
        body: `Order #${shortId} was automatically cancelled because you did not confirm it within ${SELLER_CONFIRM_TIMEOUT_MINUTES} minutes. Please process orders promptly to avoid cancellations.`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      });
    }

    // 6. Notify buyer
    if (order.buyer) {
      await notify({
        recipientId: order.buyer,
        type: "order_cancelled",
        title: "Your order has been cancelled",
        body: `Order #${shortId} was automatically cancelled because the seller did not confirm it in time. You will receive a full refund if payment was made.`,
        link: `/purchases/${order._id}`,
        metadata: { orderId: order._id },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 1: Shipper không accept đơn trong TIMEOUT_MINUTES phút
// ─────────────────────────────────────────────────────────────────────────────
async function expirePendingAcceptance() {
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "pending_acceptance",
    updatedAt: { $lt: cutoff },
  })
    .select("_id shipper seller buyer")
    .lean();

  if (!expiredOrders.length) return;

  console.log(
    `[ShipperAcceptance] Found ${expiredOrders.length} expired pending order(s)`
  );

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();

    // 1. Reset đơn về ready_to_ship
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
      { new: true }
    );

    if (!reset) {
      console.log(`[ShipperAcceptance] Order ${order._id} already processed, skipping.`);
      continue;
    }

    console.log(`[ShipperAcceptance] Order ${order._id} returned to pool.`);

    // 2. Deactivate shipper cũ + gửi notify
    if (order.shipper) {
      await notify({
        recipientId: order.shipper,
        type: "order_unassigned",
        title: "Order assignment cancelled",
        body: `Order #${shortId} was unassigned because you did not respond within ${TIMEOUT_MINUTES} minutes.`,
        link: `/shipper/available`,
        metadata: { orderId: order._id },
      });

      await deactivateShipper(
        order.shipper,
        shortId,
        `You did not accept the order within ${TIMEOUT_MINUTES} minutes.`
      );
    }

    // 3. Notify seller
    if (order.seller) {
      await notify({
        recipientId: order.seller,
        type: "order_reassigning",
        title: "Finding a new shipper",
        body: `Order #${shortId} shipper did not respond. The system is reassigning a new shipper.`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      });
    }

    // 4. Gán đơn cho shipper KHÁC (sau khi isAvailable = false đã được lưu)
    console.log(`[ShipperAcceptance] Attempting to reassign order ${order._id} to a new shipper...`);
    try {
      await autoAssignOrder(reset, order.shipper);
      console.log(`[ShipperAcceptance] autoAssignOrder completed for order ${order._id}`);
    } catch (err) {
      console.error(`[ShipperAcceptance] autoAssignOrder failed for order ${order._id}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 2: Shipper không mark delivered trong SHIPPING_TIMEOUT_MINUTES phút
// ─────────────────────────────────────────────────────────────────────────────
async function expireShippingOrders() {
  const cutoff = new Date(Date.now() - SHIPPING_TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "shipping",
    updatedAt: { $lt: cutoff },
  })
    .select("_id shipper seller buyer")
    .lean();

  if (!expiredOrders.length) return;

  console.log(
    `[ShipperShipping] Found ${expiredOrders.length} expired shipping order(s)`
  );

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();

    // 1. Reset đơn về ready_to_ship
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
      { new: true }
    );

    if (!reset) {
      console.log(`[ShipperShipping] Order ${order._id} already processed, skipping.`);
      continue;
    }

    console.log(`[ShipperShipping] Order ${order._id} unassigned, returned to pool.`);

    // 2. Deactivate shipper cũ + gửi notify
    if (order.shipper) {
      await notify({
        recipientId: order.shipper,
        type: "order_unassigned",
        title: "Order unassigned — delivery timeout",
        body: `Order #${shortId} was unassigned because you did not mark it as delivered within ${SHIPPING_TIMEOUT_MINUTES} minutes.`,
        link: `/shipper/available`,
        metadata: { orderId: order._id },
      });

      await deactivateShipper(
        order.shipper,
        shortId,
        `You did not deliver the order within ${SHIPPING_TIMEOUT_MINUTES} minutes.`
      );
    }

    // 3. Notify seller
    if (order.seller) {
      await notify({
        recipientId: order.seller,
        type: "order_reassigning",
        title: "Finding a new shipper",
        body: `Order #${shortId} shipper did not confirm delivery. The system is reassigning a new shipper.`,
        link: `/seller/orders`,
        metadata: { orderId: order._id },
      });
    }

    // 4. Gán đơn cho shipper KHÁC (sau khi isAvailable = false đã được lưu)
    console.log(`[ShipperShipping] Attempting to reassign order ${order._id} to a new shipper...`);
    try {
      await autoAssignOrder(reset, order.shipper);
      console.log(`[ShipperShipping] autoAssignOrder completed for order ${order._id}`);
    } catch (err) {
      console.error(`[ShipperShipping] autoAssignOrder failed for order ${order._id}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 3: Auto-complete đơn đã delivered sau DELIVERED_AUTO_COMPLETE_MINUTES phút
// ─────────────────────────────────────────────────────────────────────────────
async function autoCompleteDeliveredOrders() {
  const cutoff = new Date(Date.now() - DELIVERED_AUTO_COMPLETE_MINUTES * 60 * 1000);

  const deliveredOrders = await Order.find({
    status: "delivered",
    updatedAt: { $lt: cutoff },
  })
    .select("_id seller buyer")
    .lean();

  if (!deliveredOrders.length) return;

  console.log(
    `[AutoComplete] Found ${deliveredOrders.length} delivered order(s) to check`
  );

  for (const order of deliveredOrders) {
    const dispute = await DeliveryDispute.findOne({
      order: order._id,
      status: { $in: ["PENDING_SHIPPER", "SHIPPER_RESPONDED", "REPORTED_TO_ADMIN"] },
    }).lean();

    if (dispute) continue;

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
      { new: true }
    );

    if (completed) {
      console.log(`[AutoComplete] Order ${order._id} auto-completed`);

      const revenueService = require("../services/revenueService");
      await revenueService.processOrderCompletion(order._id);

      if (order.seller) {
        await notify({
          recipientId: order.seller,
          type: "order_completed",
          title: "Order auto-completed",
          body: `Order #${shortId} was automatically completed as buyer did not report any issues.`,
          link: `/seller/orders`,
          metadata: { orderId: order._id },
        });
      }

      if (order.buyer) {
        await notify({
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

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 4: ready_to_ship không có shipper nhận sau READY_TO_SHIP_REASSIGN_MINUTES phút
// ─────────────────────────────────────────────────────────────────────────────
async function expireReadyToShipOrders() {
  const cutoff = new Date(Date.now() - READY_TO_SHIP_REASSIGN_MINUTES * 60 * 1000);

  const staleOrders = await Order.find({
    status: "ready_to_ship",
    shipper: null,
    updatedAt: { $lt: cutoff },
  })
    .select("_id seller")
    .lean();

  if (!staleOrders.length) return;

  console.log(`[ReadyToShip] Found ${staleOrders.length} stale ready_to_ship order(s), reassigning...`);

  for (const order of staleOrders) {
    // Atomic refresh updatedAt trước khi assign để tránh double-fire
    const refreshed = await Order.findOneAndUpdate(
      { _id: order._id, status: "ready_to_ship", shipper: null },
      {
        $push: {
          statusHistory: {
            status: "ready_to_ship",
            timestamp: new Date(),
            note: `No shipper accepted within ${READY_TO_SHIP_REASSIGN_MINUTES} minutes. Attempting reassignment.`,
          },
        },
      },
      { new: true }
    );

    if (!refreshed) continue; // already picked up

    try {
      await autoAssignOrder(refreshed);
      console.log(`[ReadyToShip] autoAssignOrder completed for order ${order._id}`);
    } catch (err) {
      console.error(`[ReadyToShip] autoAssignOrder failed for order ${order._id}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Init cron job
// ─────────────────────────────────────────────────────────────────────────────
function initShipperAcceptanceJob() {
  cron.schedule("* * * * *", async () => {
    try {
      await expireNewOrders();
      await expirePendingAcceptance();
      await expireShippingOrders();
      await expireReadyToShipOrders();
      await autoCompleteDeliveredOrders();
    } catch (err) {
      console.error("[ShipperJob] Unexpected error:", err.message);
    }
  });

  console.log(
    `✅ Shipper acceptance timeout job initialized (${TIMEOUT_MINUTES}min timeout, runs every minute)`
  );
}

module.exports = {
  initShipperAcceptanceJob,
  expireNewOrders,
  expirePendingAcceptance,
  expireShippingOrders,
  expireReadyToShipOrders,
  autoCompleteDeliveredOrders,
};
