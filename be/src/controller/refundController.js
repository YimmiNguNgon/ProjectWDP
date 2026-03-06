const refundService = require("../services/refundService");
const mongoose = require("mongoose");

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

const RefundRequest = require("../models/RefundRequest");

exports.getRefundByOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
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
