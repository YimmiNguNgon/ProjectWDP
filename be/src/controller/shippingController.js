const Order = require("../models/Order");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");

/**
 * Generate shipping label for an order
 * POST /api/orders/:id/shipping-label
 * Returns a downloadable PDF shipping label
 */
exports.generateShippingLabel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findById(id)
            .populate("buyer", "username email")
            .populate("seller", "username email")
            .populate("items.productId", "title")
            .lean();

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only seller can generate shipping label
        if (order.seller._id.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the seller can generate shipping labels",
            });
        }

        // Validate shipping address exists
        if (!order.shippingAddress || !order.shippingAddress.street) {
            return res.status(400).json({
                message: "Shipping address is required to generate label",
            });
        }

        // Create PDF
        const doc = new PDFDocument({ size: "A4", margin: 50 });

        // Set response headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=shipping-label-${id}.pdf`
        );

        // Pipe PDF to response
        doc.pipe(res);

        // --- PDF Content ---

        // Header
        doc
            .fontSize(24)
            .font("Helvetica-Bold")
            .text("SHIPPING LABEL", { align: "center" })
            .moveDown(0.5);

        doc
            .fontSize(10)
            .font("Helvetica")
            .text(`Order ID: ${id}`, { align: "center" })
            .moveDown(1);

        // Separator line
        doc
            .strokeColor("#000000")
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke()
            .moveDown(1);

        // From (Seller)
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("FROM:", 50, doc.y);

        doc
            .fontSize(10)
            .font("Helvetica")
            .text(order.seller.username || "Seller", 50, doc.y + 5)
            .text(order.seller.email || "", 50, doc.y + 5)
            .moveDown(2);

        // To (Buyer)
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("TO:", 50, doc.y);

        const addr = order.shippingAddress;
        doc
            .fontSize(10)
            .font("Helvetica")
            .text(order.buyer.username || "Buyer", 50, doc.y + 5)
            .text(addr.street || "", 50, doc.y + 5)
            .text(
                `${addr.city || ""}, ${addr.state || ""} ${addr.zipCode || ""}`,
                50,
                doc.y + 5
            )
            .text(addr.country || "", 50, doc.y + 5)
            .moveDown(2);

        // Separator line
        doc
            .strokeColor("#000000")
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke()
            .moveDown(1);

        // Tracking Number (if available)
        if (order.trackingNumber) {
            doc
                .fontSize(12)
                .font("Helvetica-Bold")
                .text("TRACKING NUMBER:", 50, doc.y);

            doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .text(order.trackingNumber, 50, doc.y + 5)
                .moveDown(2);
        }

        // Order Details
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("ORDER DETAILS:", 50, doc.y)
            .moveDown(0.5);

        doc.fontSize(10).font("Helvetica");

        order.items.forEach((item, index) => {
            doc.text(
                `${index + 1}. ${item.title} (Qty: ${item.quantity}) - $${item.price.toFixed(2)}`,
                60,
                doc.y + 5
            );
        });

        doc
            .moveDown(1)
            .fontSize(11)
            .font("Helvetica-Bold")
            .text(`Total: $${order.totalAmount.toFixed(2)}`, 60, doc.y + 5)
            .moveDown(2);

        // Footer
        doc
            .fontSize(8)
            .font("Helvetica")
            .text(
                `Generated on ${new Date().toLocaleString()}`,
                50,
                doc.y + 20,
                { align: "center" }
            );

        // Finalize PDF
        doc.end();

        // Note: In a production app, you'd save this PDF to cloud storage (e.g., Cloudinary)
        // and update order.shippingLabel with the URL
    } catch (err) {
        next(err);
    }
};
