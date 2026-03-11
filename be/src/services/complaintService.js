const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const Order = require("../models/Order");
const User = require("../models/User");
const { evaluateSellerTrust } = require("./sellerTrustService");

const createHttpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/** 1. Create Complaint */
async function createComplaint(buyerId, orderId, sellerId, reason, content, images) {
  // 1️⃣ Validate Order Exists
  const order = await Order.findById(orderId).lean();
  if (!order) throw createHttpError("Order not found", 404);

  // 2️⃣ Order Must Belong to Buyer
  if (order.buyer.toString() !== buyerId.toString()) {
    throw createHttpError("Order does not belong to you", 403);
  }

  // sellerId must match order.seller
  if (order.seller && order.seller.toString() !== sellerId.toString()) {
    throw createHttpError("Invalid sellerId for this order", 400);
  }

  // 3️⃣ Order status must be one of: shipped, delivered, completed
  const validStatuses = ["shipped", "delivered", "completed"];
  if (!validStatuses.includes(order.status)) {
    throw createHttpError(`Cannot create complaint for order with status: ${order.status}`, 400);
  }

  // 4️⃣ Only 1 OPEN/SENT_TO_ADMIN complaint per order
  const existingComplaint = await Complaint.findOne({
    order: orderId,
    status: { $in: ["OPEN", "SENT_TO_ADMIN"] }
  });
  if (existingComplaint) {
    throw createHttpError("A complaint is already currently active for this order", 409);
  }

  // 5️⃣ Evidence Required
  if (!images || images.length === 0) {
    throw createHttpError("Evidence (images/videos) is required to open a complaint", 400);
  }

  const complaint = new Complaint({
    order: orderId,
    buyer: buyerId,
    seller: sellerId,
    reason,
    content,
    images: Array.isArray(images) ? images : [images],
    status: "OPEN",
    history: [
      { actionBy: buyerId, action: "CREATED", note: "", at: new Date() }
    ]
  });

  await complaint.save();
  return complaint;
}

/** 2. Seller Handle Complaint (Agrees or Rejects internally, doesn't close it, it either gets resolved or escalated) */
// According to new logic, if seller rejects -> buyer can escalate.
async function sellerReplyComplaint(sellerId, complaintId, note) {
    const complaint = await Complaint.findOne({ _id: complaintId, seller: sellerId });
    if (!complaint) throw createHttpError("Complaint not found", 404);
    if (complaint.status !== "OPEN") throw createHttpError("Complaint is not open", 400);

    // Provide a reply
    complaint.history.push({
        actionBy: sellerId,
        action: "SELLER_REPLY",
        note: note || "Seller responded",
        at: new Date()
    });

    await complaint.save();
    return complaint;
}

/** 3. Buyer Escalate to Admin */
async function escalateToAdmin(buyerId, complaintId, note) {
  const complaint = await Complaint.findOne({ _id: complaintId, buyer: buyerId });
  if (!complaint) throw createHttpError("Complaint not found", 404);
  if (complaint.status !== "OPEN") throw createHttpError("Complaint cannot be escalated right now", 400);

  complaint.status = "SENT_TO_ADMIN";
  complaint.history.push({
    actionBy: buyerId,
    action: "ESCALATED_TO_ADMIN",
    note: note || "",
    at: new Date()
  });

  await complaint.save();
  return complaint;
}

/** 4. Admin Resolve Complaint */
async function adminResolveComplaint(adminId, complaintId, resolution, note) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw createHttpError("Complaint not found", 404);
  if (complaint.status === "RESOLVED" || complaint.status === "CLOSED") {
    throw createHttpError("Complaint is already resolved or closed", 400);
  }

  if (!["APPROVED", "REJECTED"].includes(resolution)) {
    throw createHttpError("Resolution must be 'APPROVED' or 'REJECTED'", 400);
  }

  complaint.status = "RESOLVED";
  complaint.resolution = resolution;
  complaint.resolutionNote = note || "";
  complaint.resolvedBy = adminId;
  complaint.resolvedAt = new Date();
  
  complaint.history.push({
    actionBy: adminId,
    action: `ADMIN_RESOLVED`,
    note: `Resolution: ${resolution} - Note: ${note || ""}`,
    at: new Date()
  });

  await complaint.save();

  // ONLY affect trust score if APPROVED (Buyer is right, Seller is at fault)
  // We will re-evaluate seller trust. The score algorithm will count this approved complaint.
  if (resolution === "APPROVED") {
      await evaluateSellerTrust(complaint.seller, "COMPLAINT_APPROVED_BY_ADMIN");
  }

  return complaint;
}

/** 5. Cron Job: Auto Escalate After 48h */
async function autoEscalateComplaints() {
    console.log("[Complaint Job] Tim kiem complaint qua 48h chua duoc giai quyet...");
    const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    // Check OPEN complaints created before 48 hours ago
    const expiredComplaints = await Complaint.find({
        status: "OPEN",
        createdAt: { $lt: expirationTime }
    });

    let escalatedCount = 0;
    for (const complaint of expiredComplaints) {
        complaint.status = "SENT_TO_ADMIN";
        complaint.history.push({
            actionBy: null, // System
            action: "AUTO_ESCALATED",
            note: "Seller did not resolve within 48h",
            at: new Date()
        });
        await complaint.save();
        escalatedCount++;
    }

    return { escalatedCount };
}

module.exports = {
  createComplaint,
  sellerReplyComplaint,
  escalateToAdmin,
  adminResolveComplaint,
  autoEscalateComplaints
};
