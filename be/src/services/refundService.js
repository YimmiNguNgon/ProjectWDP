const RefundRequest = require("../models/RefundRequest");
const Order = require("../models/Order");
const Complaint = require("../models/Complaint");
const { evaluateSellerTrust } = require("./sellerTrustService");

const createHttpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

async function createRefundRequest(buyerId, orderId, reason, description) {
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

  const refund = await RefundRequest.create({
    order: orderId,
    buyer: buyerId,
    seller: order.seller,
    reason,
    description,
    status: "PENDING",
    requestedAt: new Date(),
  });

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
    status: "sent_to_admin",
    resolvedBy: adminId,
    resolvedAt: new Date(),
    resolution: resolutionStatus === "ADMIN_APPROVED" ? "approved" : "rejected",
  });
  await complaint.save();

  await evaluateSellerTrust(refund.seller, "REFUND_DISPUTE");

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

async function confirmReturnReceived(sellerId, refundId) {
  const refund = await RefundRequest.findOne({ _id: refundId, seller: sellerId });
  if (!refund) throw createHttpError("Refund request not found", 404);
  
  if (!["APPROVED", "AUTO_APPROVED", "ADMIN_APPROVED"].includes(refund.status)) {
    throw createHttpError("Refund request is not in an approved state", 409);
  }

  const order = await Order.findOne({ _id: refund.order, seller: sellerId });
  if (!order || order.status !== "delivered_to_seller") {
    throw createHttpError("Order has not been delivered back to the seller yet", 400);
  }

  refund.status = "SELLER_RECEIVED_RETURN";
  await refund.save();

  await Order.findByIdAndUpdate(order._id, {
    status: "returned",
    $push: {
      statusHistory: {
        status: "returned",
        timestamp: new Date(),
        note: "Seller confirmed receipt of returned item, refund completed",
      },
    },
    updatedAt: new Date(),
  });

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
