const RefundRequest = require("../models/RefundRequest");
const Order = require("../models/Order");
const Complaint = require("../models/Complaint");
const { evaluateSellerTrust } = require("./sellerTrustService");

async function createRefundRequest(buyerId, orderId, reason, description) {
    const order = await Order.findOne({ _id: orderId, buyer: buyerId }).lean();
    if (!order) throw new Error("Order not found or not owned by you");

    // Only delivered or completed orders
    if (order.status !== "delivered" && order.status !== "completed") {
        throw new Error("Order must be delivered to request a refund");
    }

    // Must be <= 7 days since delivered
    const deliveredAt = order.deliveredAt || order.updatedAt; // fallback
    const daysSinceDelivered = (new Date() - new Date(deliveredAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivered > 7) {
        throw new Error("Return window has expired (7 days)");
    }

    // Check if there is already a pending refund
    const existing = await RefundRequest.findOne({ order: orderId, buyer: buyerId, status: "PENDING" });
    if (existing) {
        throw new Error("A refund request is already pending for this order");
    }

    // Status goes to refund_requested
    await Order.findByIdAndUpdate(orderId, { status: "refund_requested" });

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
    if (!refund) throw new Error("Refund request not found");
    if (refund.status !== "PENDING") throw new Error("Refund no longer pending");

    refund.status = "APPROVED";
    refund.respondedAt = new Date();
    refund.sellerNote = sellerNote || "";
    refund.faultType = "SELLER_FAULT"; // default for seller-approved
    await refund.save();

    await Order.findByIdAndUpdate(refund.order, { status: "refunded", updatedAt: new Date() });

    // TrustScore recalculation
    await evaluateSellerTrust(sellerId, "REFUND_EVENT");

    return refund;
}

async function rejectRefund(sellerId, refundId, sellerNote) {
    const refund = await RefundRequest.findOne({ _id: refundId, seller: sellerId });
    if (!refund) throw new Error("Refund request not found");
    if (refund.status !== "PENDING") throw new Error("Refund no longer pending");

    refund.status = "REJECTED";
    refund.respondedAt = new Date();
    refund.sellerNote = sellerNote || "";
    refund.faultType = "BUYER_FAULT"; // If seller rejects, assumption is buyer fault unless disputed
    await refund.save();

    // Order status goes back to delivered or stays refund_request? Let's leave it delivered so they can't open again (unless they dispute)
    await Order.findByIdAndUpdate(refund.order, { status: "delivered", updatedAt: new Date() });

    // TrustScore recalculation not strictly necessary here, but we can do it
    await evaluateSellerTrust(sellerId, "REFUND_EVENT");

    return refund;
}

async function adminReviewDispute(adminId, refundId, resolutionStatus, faultType, adminNote) {
    const refund = await RefundRequest.findById(refundId);
    if (!refund) throw new Error("Refund request not found");
    if (refund.status !== "DISPUTED") throw new Error("Refund request is not disputed");

    // resolutionStatus must be "ADMIN_APPROVED" or "ADMIN_REJECTED"
    refund.status = resolutionStatus;
    refund.faultType = faultType; // e.g., "SELLER_FAULT" or "BUYER_FAULT" or "LOGISTICS_FAULT"
    refund.adminNote = adminNote || "";
    refund.reviewedBy = adminId;
    refund.respondedAt = new Date();
    await refund.save();

    if (resolutionStatus === "ADMIN_APPROVED") {
        await Order.findByIdAndUpdate(refund.order, { status: "refunded", updatedAt: new Date() });
    } else {
        await Order.findByIdAndUpdate(refund.order, { status: "delivered", updatedAt: new Date() });
    }

    // Auto create complaint for dispute tracking on trust score
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
    if (!refund) throw new Error("Refund request not found");
    // Only REJECTED refunds can be disputed
    if (refund.status !== "REJECTED") throw new Error("Cannot open dispute on this refund request");

    refund.status = "DISPUTED";
    await refund.save();

    // Trust score will be affected when admin resolves, or we can create complaint here.
    return refund;
}

// Chạy job auto approve
async function runAutoApproveRefunds() {
    console.log("[Refund Job] Bắt đầu tìm kiếm request 48h chưa xử lý...");

    // Tìm các đơn PENDING quá 48h
    const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const expiredRefunds = await RefundRequest.find({
        status: "PENDING",
        requestedAt: { $lt: expirationTime }
    });

    let approvedCount = 0;
    const sellersToUpdate = new Set();

    for (const refund of expiredRefunds) {
        refund.status = "AUTO_APPROVED";
        refund.faultType = "SELLER_FAULT"; // Seller ignores -> seller fault
        refund.autoApproveAt = new Date();
        await refund.save();

        await Order.findByIdAndUpdate(refund.order, { status: "refunded", updatedAt: new Date() });
        sellersToUpdate.add(refund.seller.toString());
        approvedCount++;
    }

    // Trigger recalculation in parallel
    for (const sellerId of sellersToUpdate) {
        evaluateSellerTrust(sellerId, "AUTO_REFUND").catch(err => console.error("Recalculate error for seller", sellerId, err));
    }

    return { approvedCount };
}

module.exports = {
    createRefundRequest,
    approveRefund,
    rejectRefund,
    adminReviewDispute,
    buyerDisputeRefund,
    runAutoApproveRefunds
};
