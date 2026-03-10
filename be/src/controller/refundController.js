const refundService = require("../services/refundService");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const RefundRequest = require("../models/RefundRequest");

exports.requestRefund = async (req, res, next) => {
    try {
        const { orderId, reason, description } = req.body;
        const buyerId = req.user._id;

        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        if (!reason) {
            return res.status(400).json({ message: "Reason is required" });
        }

        const refund = await refundService.createRefundRequest(buyerId, orderId, reason, description);
        res.status(201).json({ message: "Refund requested successfully", data: refund });
    } catch (err) {
        next(err);
    }
};

exports.approveRefund = async (req, res, next) => {
    try {
        const { id } = req.params; // refund request ID
        const { sellerNote } = req.body;
        const sellerId = req.user._id;

        const refund = await refundService.approveRefund(sellerId, id, sellerNote);
        res.status(200).json({ message: "Refund approved successfully", data: refund });
    } catch (err) {
        next(err);
    }
};

exports.rejectRefund = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sellerNote } = req.body;
        const sellerId = req.user._id;

        const refund = await refundService.rejectRefund(sellerId, id, sellerNote);
        res.status(200).json({ message: "Refund rejected", data: refund });
    } catch (err) {
        next(err);
    }
};

exports.disputeRefund = async (req, res, next) => {
    try {
        const { id } = req.params;
        const buyerId = req.user._id;

        const refund = await refundService.buyerDisputeRefund(buyerId, id);
        res.status(200).json({ message: "Refund disputed", data: refund });
    } catch (err) {
        next(err);
    }
};

exports.confirmReturnReceived = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sellerId = req.user._id;

        const refund = await refundService.confirmReturnReceived(sellerId, id);
        res.status(200).json({ message: "Return receipt confirmed", data: refund });
    } catch (err) {
        next(err);
    }
};

exports.adminReviewRefund = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { resolutionStatus, faultType, adminNote } = req.body;
        const adminId = req.user._id;

        if (!["ADMIN_APPROVED", "ADMIN_REJECTED"].includes(resolutionStatus)) {
            return res.status(400).json({ message: "Invalid resolution status" });
        }
        if (!["SELLER_FAULT", "BUYER_FAULT", "LOGISTICS_FAULT"].includes(faultType)) {
            return res.status(400).json({ message: "Invalid fault type" });
        }

        const refund = await refundService.adminReviewDispute(adminId, id, resolutionStatus, faultType, adminNote);
        res.status(200).json({ message: "Admin reviewed refund", data: refund });
    } catch (err) {
        next(err);
    }
};

exports.getRefundByOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await Order.findById(orderId).select("buyer seller").lean();
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const isOwner =
            String(order.buyer) === String(req.user._id) ||
            String(order.seller) === String(req.user._id);
        if (!isOwner && req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const refund = await RefundRequest.findOne({ order: orderId })
            .populate("buyer", "username avatarUrl")
            .populate("seller", "username avatarUrl")
            .lean();

        res.status(200).json({ data: refund });
    } catch (err) {
        next(err);
    }
};

exports.getBuyerRefunds = async (req, res, next) => {
    try {
        const buyerId = req.user._id;
        const refunds = await RefundRequest.find({ buyer: buyerId })
            .populate("order")
            .populate("seller", "username avatarUrl")
            .sort({ requestedAt: -1 })
            .lean();
        res.status(200).json({ data: refunds });
    } catch (err) {
        next(err);
    }
};

exports.getSellerRefunds = async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        const refunds = await RefundRequest.find({ seller: sellerId })
            .populate("order")
            .populate("buyer", "username avatarUrl")
            .sort({ requestedAt: -1 })
            .lean();
        res.status(200).json({ data: refunds });
    } catch (err) {
        next(err);
    }
};

exports.getAdminRefunds = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const status = String(req.query.status || "DISPUTED").toUpperCase();
        const allowedStatuses = new Set([
            "ALL",
            "PENDING",
            "APPROVED",
            "REJECTED",
            "AUTO_APPROVED",
            "DISPUTED",
            "ADMIN_APPROVED",
            "ADMIN_REJECTED",
            "CANCELLED",
        ]);
        if (!allowedStatuses.has(status)) {
            return res.status(400).json({ message: "Invalid status filter" });
        }

        const filter = status === "ALL" ? {} : { status };

        const [refunds, total] = await Promise.all([
            RefundRequest.find(filter)
                .populate("order")
                .populate("buyer", "username avatarUrl email")
                .populate("seller", "username avatarUrl email")
                .populate("reviewedBy", "username email")
                .sort({ requestedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RefundRequest.countDocuments(filter),
        ]);

        res.status(200).json({
            data: refunds,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        next(err);
    }
};
