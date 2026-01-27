const Order = require("../models/Order");
const Product = require("../models/Product");
const mongoose = require("mongoose");

/**
 * Update order status
 * PATCH /api/orders/:id/status
 * Body: { status: "processing" | "shipped" | "delivered" | "cancelled" | "returned", note?: string }
 */
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only seller can update order status
        if (order.seller.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the seller can update order status",
            });
        }

        const validStatuses = [
            "created",
            "paid",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "failed",
            "returned",
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        // Update status
        order.status = status;
        order.updatedAt = new Date();

        // Add to status history
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || "",
        });

        await order.save();

        // TODO: Emit socket event to notify buyer
        // io.to(order.buyer.toString()).emit("orderStatusUpdated", { orderId: id, status });

        const updated = await Order.findById(id)
            .populate("buyer", "username email")
            .populate("seller", "username")
            .populate("items.productId", "title price image images")
            .lean();

        return res.json({
            message: `Order status updated to ${status}`,
            data: updated,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Add/update tracking number
 * PATCH /api/orders/:id/tracking
 * Body: { trackingNumber: string, estimatedDelivery?: Date }
 */
exports.addTrackingNumber = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { trackingNumber, estimatedDelivery } = req.body;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        if (!trackingNumber) {
            return res.status(400).json({ message: "Tracking number is required" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only seller can add tracking
        if (order.seller.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the seller can add tracking information",
            });
        }

        order.trackingNumber = trackingNumber;
        if (estimatedDelivery) {
            order.estimatedDelivery = new Date(estimatedDelivery);
        }
        order.updatedAt = new Date();

        await order.save();

        return res.json({
            message: "Tracking number added successfully",
            data: {
                trackingNumber: order.trackingNumber,
                estimatedDelivery: order.estimatedDelivery,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get order status history
 * GET /api/orders/:id/history
 */
exports.getStatusHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findById(id).select("statusHistory buyer seller").lean();
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Buyer, seller, or admin can view
        const isBuyer = order.buyer.toString() === userId.toString();
        const isSeller = order.seller.toString() === userId.toString();
        const isAdmin = req.user.role === "admin";

        if (!isBuyer && !isSeller && !isAdmin) {
            return res.status(403).json({ message: "Forbidden" });
        }

        return res.json({ data: order.statusHistory || [] });
    } catch (err) {
        next(err);
    }
};

/**
 * Update shipping address
 * PATCH /api/orders/:id/shipping-address
 * Body: { street, city, state, zipCode, country }
 */
exports.updateShippingAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { street, city, state, zipCode, country } = req.body;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only buyer can update shipping address, and only before it's shipped
        if (order.buyer.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the buyer can update shipping address",
            });
        }

        if (["shipped", "delivered"].includes(order.status)) {
            return res.status(400).json({
                message: "Cannot update shipping address after order has been shipped",
            });
        }

        order.shippingAddress = {
            street: street || order.shippingAddress?.street || "",
            city: city || order.shippingAddress?.city || "",
            state: state || order.shippingAddress?.state || "",
            zipCode: zipCode || order.shippingAddress?.zipCode || "",
            country: country || order.shippingAddress?.country || "",
        };
        order.updatedAt = new Date();

        await order.save();

        return res.json({
            message: "Shipping address updated successfully",
            data: order.shippingAddress,
        });
    } catch (err) {
        next(err);
    }
};
