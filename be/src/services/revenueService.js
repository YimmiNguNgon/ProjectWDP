const Order = require("../models/Order");
const Revenue = require("../models/Revenue");

exports.processOrderCompletion = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return null;

    let orderUpdated = false;

    // 1. Cập nhật paymentStatus thành "paid" nếu chưa
    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      orderUpdated = true;
    }

    if (orderUpdated) {
      await order.save();
    }

    // 2. Ghi nhận doanh thu (IDEMPOTENT)
    const existingRevenue = await Revenue.findOne({
      order: order._id,
      type: "seller_revenue",
    });

    if (!existingRevenue) {
      const commission = parseFloat((order.totalAmount * 0.05).toFixed(2));
      const sellerNet = parseFloat((order.totalAmount * 0.95).toFixed(2));

      const revenueRecords = [
        {
          type: "system_commission",
          order: order._id,
          orderGroup: order.orderGroup,
          seller: order.seller,
          amount: commission,
        },
        {
          type: "seller_revenue",
          order: order._id,
          orderGroup: order.orderGroup,
          seller: order.seller,
          amount: sellerNet,
        },
      ];

      // Record shipping revenue for the system if not already recorded for this group
      if (order.orderGroup) {
        const OrderGroup = require("../models/OrderGroup");
        const group = await OrderGroup.findById(order.orderGroup);
        if (group && group.shippingPrice > 0) {
          const existingShippingRevenue = await Revenue.findOne({
            type: "system_shipping",
            orderGroup: order.orderGroup,
          });

          if (!existingShippingRevenue) {
            revenueRecords.push({
              type: "system_shipping",
              order: null,
              orderGroup: order.orderGroup,
              seller: null,
              amount: parseFloat(group.shippingPrice.toFixed(2)),
            });
          }
        }
      }

      await Revenue.insertMany(revenueRecords);
      console.log(
        `[RevenueService] Successfully recorded revenue for order ${order._id}`
      );
    }

    return order;
  } catch (error) {
    console.error(`[RevenueService] Error processing completion for order ${orderId}:`, error.message);
    throw error;
  }
};

exports.revertOrderRevenue = async (orderId) => {
  try {
    const result = await Revenue.deleteMany({ order: orderId });
    console.log(
      `[RevenueService] Reverted revenue for order ${orderId}. Deleted ${result.deletedCount} records.`
    );
    return result;
  } catch (error) {
    console.error(`[RevenueService] Error reverting revenue for order ${orderId}:`, error.message);
    throw error;
  }
};
