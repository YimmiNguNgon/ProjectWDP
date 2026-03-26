const RefundRequest = require("../models/RefundRequest");
const Order = require("../models/Order");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Product = require("../models/Product"); // Import Product model
const mongoose = require("mongoose");
const { evaluateSellerTrust } = require("./sellerTrustService");
const {
  normalizeSelectedVariants,
  buildVariantKey,
  syncProductStockFromVariants,
} = require("../utils/productInventory");
const notificationService = require("./notificationService");
const revenueService = require("./revenueService");

const createHttpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

async function createRefundRequest(buyerId, orderId, reason, description, images = []) {
  const order = await Order.findOne({ _id: orderId, buyer: buyerId }).lean();
  if (!order) throw createHttpError("Order not found or not owned by you", 404);

  if (order.status !== "delivered" && order.status !== "completed") {
    throw createHttpError("Order must be delivered to request a refund", 400);
  }

  const deliveredAt = order.deliveredAt || order.updatedAt;
  const daysSinceDelivered =
    (new Date() - new Date(deliveredAt)) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivered > 7) {
    throw createHttpError("Return window has expired (7 days)", 400);
  }

  const existing = await RefundRequest.findOne({
    order: orderId,
    buyer: buyerId,
    status: { $in: ["PENDING", "DISPUTED"] },
  });
  if (existing) {
    throw createHttpError("A refund request is already being processed", 409);
  }

  if (!images || images.length === 0) {
      throw createHttpError("Evidence (images/videos) is required to open a return request", 400);
  }
  if (images.length > 5) {
      throw createHttpError("You can only upload up to 5 images", 400);
  }

  const refund = await RefundRequest.create({
    order: orderId,
    buyer: buyerId,
    seller: order.seller,
    reason,
    description,
    images: (Array.isArray(images) ? images : [images]).map(img => 
      typeof img === 'string' ? img : img.url || img
    ),
    status: "PENDING",
    requestedAt: new Date(),
  });

  try {
    const buyerArr = await User.find({ _id: buyerId }).select("username").lean();
    const buyerObj = buyerArr[0];
    await notificationService.sendNotification({
        recipientId: order.seller,
        type: "new_refund_request",
        title: "New Refund/Return Request",
        body: `Buyer ${buyerObj?.username || "Someone"} requested a return/refund for order #${orderId.toString().slice(-6)}.`,
        link: "/seller/refunds",
        metadata: { refundId: refund._id, orderId }
    });
  } catch (err) {
    console.error("Failed to send notification", err);
  }

  return refund;
}

async function approveRefund(sellerId, refundId, sellerNote) {
  const refund = await RefundRequest.findOne({ _id: refundId, seller: sellerId });
  if (!refund) throw createHttpError("Refund request not found", 404);
  if (refund.status !== "PENDING") {
    throw createHttpError("Refund no longer pending", 409);
  }

  refund.status = "APPROVED";
  refund.respondedAt = new Date();
  refund.sellerNote = sellerNote || "";
  refund.faultType = "SELLER_FAULT";
  await refund.save();

  await Order.findByIdAndUpdate(refund.order, {
    status: "waiting_return_shipment",
    $push: {
      statusHistory: {
        status: "waiting_return_shipment",
        timestamp: new Date(),
        note: "Refund approved, waiting for shipper to pick up return",
      },
    },
    updatedAt: new Date(),
  });

  await evaluateSellerTrust(sellerId, "REFUND_EVENT");

  try {
      await notificationService.sendNotification({
          recipientId: refund.buyer,
          type: "refund_approved",
          title: "Return Request Approved",
          body: `The seller has approved your return request for order #${refund.order.toString().slice(-6)}.`,
          link: `/my-ebay/purchases/${refund.order}/return`,
          metadata: { refundId: refund._id }
      });
  } catch (err) {
      console.error(err);
  }

  return refund;
}

async function rejectRefund(sellerId, refundId, sellerNote) {
  const refund = await RefundRequest.findOne({ _id: refundId, seller: sellerId });
  if (!refund) throw createHttpError("Refund request not found", 404);
  if (refund.status !== "PENDING") {
    throw createHttpError("Refund no longer pending", 409);
  }

  refund.status = "REJECTED";
  refund.respondedAt = new Date();
  refund.sellerNote = sellerNote || "";
  refund.faultType = "BUYER_FAULT";
  await refund.save();

  await evaluateSellerTrust(sellerId, "REFUND_EVENT");

  try {
      await notificationService.sendNotification({
          recipientId: refund.buyer,
          type: "refund_rejected",
          title: "Return Request Rejected",
          body: `The seller has rejected your return request for order #${refund.order.toString().slice(-6)}. If you disagree, you can open a dispute.`,
          link: `/my-ebay/purchases/${refund.order}/return`,
          metadata: { refundId: refund._id }
      });
  } catch (err) {
      console.error(err);
  }

  return refund;
}

async function adminReviewDispute(
  adminId,
  refundId,
  resolutionStatus,
  faultType,
  adminNote,
) {
  const refund = await RefundRequest.findById(refundId);
  if (!refund) throw createHttpError("Refund request not found", 404);
  if (refund.status !== "DISPUTED") {
    throw createHttpError("Refund request is not disputed", 409);
  }

  refund.status = resolutionStatus;
  refund.faultType = faultType;
  refund.adminNote = adminNote || "";
  refund.reviewedBy = adminId;
  refund.respondedAt = new Date();
  await refund.save();

  if (resolutionStatus === "ADMIN_APPROVED") {
    await Order.findByIdAndUpdate(refund.order, {
      status: "waiting_return_shipment",
      $push: {
        statusHistory: {
          status: "waiting_return_shipment",
          timestamp: new Date(),
          note: "Admin approved dispute, waiting for shipper to pick up return",
        },
      },
      updatedAt: new Date(),
    });
  }

  const complaint = new Complaint({
    order: refund.order,
    buyer: refund.buyer,
    seller: refund.seller,
    reason: "return",
    content: `Admin resolution for refund dispute: ${adminNote}`,
    status: "RESOLVED",
    resolvedBy: adminId,
    resolvedAt: new Date(),
    resolution: resolutionStatus === "ADMIN_APPROVED" ? "APPROVED" : "REJECTED",
  });
  await complaint.save();

  await complaint.save();

  await evaluateSellerTrust(refund.seller, "REFUND_DISPUTE");

  try {
      const msg = resolutionStatus === "ADMIN_APPROVED" ? "approved" : "rejected";
      
      await notificationService.sendNotification({
          recipientId: refund.buyer,
          type: "dispute_resolved",
          title: "Dispute Resolved",
          body: `Admin has ${msg} your refund dispute for order #${refund.order.toString().slice(-6)}.`,
          link: `/my-ebay/purchases/${refund.order}/return`,
          metadata: { refundId: refund._id }
      });

      await notificationService.sendNotification({
          recipientId: refund.seller,
          type: "dispute_resolved",
          title: "Dispute Resolved",
          body: `Admin has ${msg} a refund dispute against your account for order #${refund.order.toString().slice(-6)}.`,
          link: "/seller/refunds",
          metadata: { refundId: refund._id }
      });
  } catch (err) {
      console.error(err);
  }

  return refund;
}

async function buyerDisputeRefund(buyerId, refundId) {
  const refund = await RefundRequest.findOne({ _id: refundId, buyer: buyerId });
  if (!refund) throw createHttpError("Refund request not found", 404);
  if (refund.status !== "REJECTED") {
    throw createHttpError("Cannot open dispute on this refund request", 409);
  }

  refund.status = "DISPUTED";
  await refund.save();

  try {
      // Notify admins
      const admins = await User.find({ role: "admin" }).select("_id").lean();
      for (const admin of admins) {
          await notificationService.sendNotification({
              recipientId: admin._id,
              type: "new_dispute",
              title: "New Refund Dispute",
              body: `A refund dispute has been opened for order #${refund.order.toString().slice(-6)}.`,
              link: "/admin/refunds", // Assuming there is an admin refunds page or similar logic can route it
              metadata: { refundId: refund._id }
          });
      }
      // Notify seller
      await notificationService.sendNotification({
          recipientId: refund.seller,
          type: "dispute_opened",
          title: "Refund Dispute Opened",
          body: `Buyer has escalated a refund request to a dispute for order #${refund.order.toString().slice(-6)}.`,
          link: "/seller/refunds",
          metadata: { refundId: refund._id }
      });
  } catch (err) {
      console.error(err);
  }

  return refund;
}

async function runAutoApproveRefunds() {
  console.log("[Refund Job] Bat dau tim kiem request 48h chua xu ly...");

  const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const expiredRefunds = await RefundRequest.find({
    status: "PENDING",
    requestedAt: { $lt: expirationTime },
  });

  let approvedCount = 0;
  const sellersToUpdate = new Set();

  for (const refund of expiredRefunds) {
    refund.status = "AUTO_APPROVED";
    refund.faultType = "SELLER_FAULT";
    refund.autoApproveAt = new Date();
    await refund.save();

    await Order.findByIdAndUpdate(refund.order, {
      status: "waiting_return_shipment",
      $push: {
        statusHistory: {
          status: "waiting_return_shipment",
          timestamp: new Date(),
          note: "Refund auto-approved, waiting for shipper to pick up return",
        },
      },
      updatedAt: new Date(),
    });

    sellersToUpdate.add(refund.seller.toString());
    approvedCount++;
  }

  for (const sellerId of sellersToUpdate) {
    evaluateSellerTrust(sellerId, "AUTO_REFUND").catch((err) =>
      console.error("Recalculate error for seller", sellerId, err),
    );
  }

  return { approvedCount };
}

async function confirmReturnReceived(sellerId, refundId, condition = 'SELLABLE') {
  const refund = await RefundRequest.findOne({ _id: refundId, seller: sellerId });
  if (!refund) throw createHttpError("Refund request not found", 404);

  if (!["APPROVED", "AUTO_APPROVED", "ADMIN_APPROVED"].includes(refund.status)) {
    throw createHttpError("Refund request is not in an approved state", 409);
  }

  const order = await Order.findOne({ _id: refund.order, seller: sellerId });
  if (!order) {
    throw createHttpError("Order not found", 404);
  }
  if (order.status !== "delivered_to_seller") {
    throw createHttpError("Order has not been delivered back to the seller yet", 400);
  }

  if (!['SELLABLE', 'OPENED', 'DAMAGED'].includes(condition)) {
    throw createHttpError("Invalid condition. Must be SELLABLE, OPENED, or DAMAGED", 400);
  }

  // 1. Update refund status + received condition
  refund.status = "SELLER_RECEIVED_RETURN";
  refund.receivedCondition = condition;
  await refund.save();

  // 2. Restore stock ONLY if condition is SELLABLE
  if (condition === 'SELLABLE' && order.items && order.items.length > 0) {
    for (const item of order.items) {
      if (!item.productId) continue;

      const incAmount = parseInt(item.quantity) || 1;
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`[confirmReturnReceived] Product not found: ${item.productId}`);
        continue;
      }

      const normalizedVariants = normalizeSelectedVariants(item.selectedVariants || []);
      const hasVariantCombos =
        Array.isArray(product.variantCombinations) &&
        product.variantCombinations.length > 0 &&
        normalizedVariants.length > 0;

      if (hasVariantCombos) {
        // Has variants – find the matching combo and increment its quantity
        const key = buildVariantKey(normalizedVariants);
        const combo = product.variantCombinations.find((c) => c.key === key);
        if (combo) {
          combo.quantity = (Number(combo.quantity) || 0) + incAmount;
          syncProductStockFromVariants(product); // recalculates product.stock + product.quantity from all combos
          console.log(`[confirmReturnReceived] +${incAmount} to variant [${key}] of product ${product._id}`);
        } else {
          // Variant combo not found - fallback: increment top-level stock
          product.quantity = (Number(product.quantity) || 0) + incAmount;
          product.stock = (Number(product.stock) || 0) + incAmount;
          console.warn(`[confirmReturnReceived] Variant combo key "${key}" not found, incrementing top-level stock for product ${product._id}`);
        }
      } else {
        // No variants – increment top-level stock directly
        product.quantity = (Number(product.quantity) || 0) + incAmount;
        product.stock = (Number(product.stock) || 0) + incAmount;
        console.log(`[confirmReturnReceived] +${incAmount} to stock of product ${product._id} (${product.title}). New stock: ${product.stock}`);
      }

      await product.save();
    }
  }

  // 3. Update Order status to "returned"
  await Order.findByIdAndUpdate(order._id, {
    status: "returned",
    $push: {
      statusHistory: {
        status: "returned",
        timestamp: new Date(),
        note: `Seller confirmed receipt of returned item (Condition: ${condition}), refund completed`,
      },
    },
    updatedAt: new Date(),
  });

  // 4. Revert order revenue if it was previously processed
  await revenueService.revertOrderRevenue(order._id);

  return refund;
}

module.exports = {
  createRefundRequest,
  approveRefund,
  rejectRefund,
  adminReviewDispute,
  buyerDisputeRefund,
  runAutoApproveRefunds,
  confirmReturnReceived,
};
