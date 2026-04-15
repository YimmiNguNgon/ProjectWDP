const cron = require("node-cron");
const Order = require("../models/Order");
const OrderGroup = require("../models/OrderGroup");
const Product = require("../models/Product");
const Revenue = require("../models/Revenue");
const User = require("../models/User");
const DeliveryDispute = require("../models/DeliveryDispute");
const notificationService = require("../services/notificationService");
const { autoAssignOrder, autoAssignDeliveryShipper } = require("../services/orderDispatchService");

const SELLER_CONFIRM_TIMEOUT_MINUTES = 30;
const TIMEOUT_MINUTES = 15;
const SHIPPING_TIMEOUT_MINUTES = 60;
const DELIVERED_AUTO_COMPLETE_MINUTES = 60;
const READY_TO_SHIP_REASSIGN_MINUTES = 10;

const notify = (payload) =>
  notificationService.sendNotification(payload).catch((err) => {
    console.error("[ShipperJob] Notification failed:", err.message);
  });


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
    const { restoreStockForOrderItems } = require("../utils/productInventory");
    await restoreStockForOrderItems(order.items || []).catch(err => {
      console.warn(`[SellerConfirm] Failed to restore stock for order ${order._id}:`, err);
    });

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

    // 2. Reset shipper status về available + notify
    if (order.shipper) {
      await User.findByIdAndUpdate(order.shipper, {
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
      }).catch(() => {});

      await notify({
        recipientId: order.shipper,
        type: "order_unassigned",
        title: "Order assignment expired",
        body: `Order #${shortId} was unassigned due to no response. It has returned to the available pool.`,
        link: `/shipper/available`,
        metadata: { orderId: order._id },
      });
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

    // 2. Reset shipper status về available + notify
    if (order.shipper) {
      await User.findByIdAndUpdate(order.shipper, {
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
      }).catch(() => {});

      await notify({
        recipientId: order.shipper,
        type: "order_unassigned",
        title: "Order unassigned — shipping timeout",
        body: `Order #${shortId} was unassigned due to delivery timeout. It has returned to the available pool.`,
        link: `/shipper/available`,
        metadata: { orderId: order._id },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 2b: Shipper 2 không accept pending_delivery_acceptance trong TIMEOUT_MINUTES
// ─────────────────────────────────────────────────────────────────────────────
async function expirePendingDeliveryAcceptance() {
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "pending_delivery_acceptance",
    updatedAt: { $lt: cutoff },
  })
    .select("_id shipper seller buyer")
    .lean();

  if (!expiredOrders.length) return;

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();

    const reset = await Order.findOneAndUpdate(
      { _id: order._id, status: "pending_delivery_acceptance" },
      {
        shipper: null,
        status: "in_transit",
        $push: {
          statusHistory: {
            status: "in_transit",
            timestamp: new Date(),
            note: `Delivery shipper did not respond within ${TIMEOUT_MINUTES} minutes. Re-queuing.`,
          },
        },
      },
      { new: true }
    );

    if (!reset) continue;

    if (order.shipper) {
      await User.findByIdAndUpdate(order.shipper, {
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
      }).catch(() => {});

      await notify({
        recipientId: order.shipper,
        type: "order_unassigned",
        title: "Delivery assignment expired",
        body: `Order #${shortId} delivery was unassigned due to no response. It has returned to the available pool.`,
        link: `/shipper/available`,
        metadata: { orderId: order._id },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Luồng 2c: Shipper 2 không mark delivered trong SHIPPING_TIMEOUT_MINUTES
// ─────────────────────────────────────────────────────────────────────────────
async function expireDeliveringOrders() {
  const cutoff = new Date(Date.now() - SHIPPING_TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: "delivering",
    updatedAt: { $lt: cutoff },
  })
    .select("_id shipper seller buyer")
    .lean();

  if (!expiredOrders.length) return;

  for (const order of expiredOrders) {
    const shortId = order._id.toString().slice(-8).toUpperCase();

    const reset = await Order.findOneAndUpdate(
      { _id: order._id, status: "delivering" },
      {
        shipper: null,
        status: "in_transit",
        $push: {
          statusHistory: {
            status: "in_transit",
            timestamp: new Date(),
            note: `Delivery shipper did not mark delivered within ${SHIPPING_TIMEOUT_MINUTES} minutes. Reassigning.`,
          },
        },
      },
      { new: true }
    );

    if (!reset) continue;

    if (order.shipper) {
      await User.findByIdAndUpdate(order.shipper, {
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
      }).catch(() => {});

      await notify({
        recipientId: order.shipper,
        type: "order_unassigned",
        title: "Order unassigned — delivery timeout",
        body: `Order #${shortId} was unassigned due to delivery timeout. It has returned to the available pool.`,
        link: `/shipper/available`,
        metadata: { orderId: order._id },
      });
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
      await expirePendingDeliveryAcceptance();
      await expireDeliveringOrders();
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
  expirePendingDeliveryAcceptance,
  expireDeliveringOrders,
  expireReadyToShipOrders,
  autoCompleteDeliveredOrders,
};
