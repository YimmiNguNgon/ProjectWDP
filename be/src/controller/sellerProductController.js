const Product = require("../models/Product");
const mongoose = require("mongoose");
const {
    normalizeVariantCombinations,
    syncProductStockFromVariants,
} = require("../utils/productInventory");

/**
 * Get seller's own products/listings
 * GET /api/products/seller/my-listings
 * Query params: status (active, paused, ended, deleted), search, page, limit
 */
exports.getMyListings = async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        const { status, search, page = 1, limit = 20 } = req.query;

        const filter = { sellerId };

        // Filter by listing status
        if (status && status !== "all") {
            filter.listingStatus = status;
        }

        // Exclude hard-deleted items (if we ever add that)
        // For now, deleted items have listingStatus: "deleted"

        // Search filter
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("categoryId", "name slug")
            .lean();

        return res.json({
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            data: products,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update product details
 * PUT /api/products/:productId
 */
exports.updateProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const sellerId = req.user._id;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Verify ownership
        if (product.sellerId.toString() !== sellerId.toString()) {
            return res.status(403).json({ message: "Not authorized to edit this product" });
        }

        // Update allowed fields
        const {
            title,
            description,
            price,
            quantity,
            condition,
            categoryId,
            image,
            images,
            variants,
            variantCombinations,
            lowStockThreshold,
        } = req.body;

        if (title !== undefined) product.title = title;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (quantity !== undefined) product.quantity = quantity;
        if (condition !== undefined) product.condition = condition;
        if (categoryId !== undefined) product.categoryId = categoryId;
        if (image !== undefined) product.image = image;
        if (images !== undefined) product.images = images;
        if (variants !== undefined) product.variants = variants;
        if (variantCombinations !== undefined) {
            product.variantCombinations =
                normalizeVariantCombinations(variantCombinations);
            syncProductStockFromVariants(product);
        }
        if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;

        if (quantity !== undefined && variantCombinations === undefined) {
            product.quantity = Number(quantity) || 0;
            product.stock = Number(quantity) || 0;
        }

        product.updatedAt = new Date();
        await product.save();

        const updated = await Product.findById(productId)
            .populate("categoryId", "name slug")
            .lean();

        return res.json({ data: updated });
    } catch (err) {
        next(err);
    }
};

/**
 * Update listing status (active, paused, ended)
 * PATCH /api/products/:productId/status
 * Body: { listingStatus: "active" | "paused" | "ended" }
 */
exports.updateListingStatus = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const sellerId = req.user._id;
        const { listingStatus } = req.body;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const validStatuses = ["active", "paused", "ended"];
        if (!validStatuses.includes(listingStatus)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Verify ownership
        if (product.sellerId.toString() !== sellerId.toString()) {
            return res.status(403).json({ message: "Not authorized to modify this product" });
        }

        // Prevent changing status of deleted listings
        if (product.listingStatus === "deleted") {
            return res.status(400).json({ message: "Cannot modify deleted listings" });
        }

        product.listingStatus = listingStatus;
        product.updatedAt = new Date();
        await product.save();

        return res.json({
            message: `Listing status updated to ${listingStatus}`,
            data: product,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete product (soft delete)
 * DELETE /api/products/:productId
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const sellerId = req.user._id;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Verify ownership
        if (product.sellerId.toString() !== sellerId.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this product" });
        }

        // Soft delete
        product.listingStatus = "deleted";
        product.deletedAt = new Date();
        product.updatedAt = new Date();
        await product.save();

        return res.json({ message: "Product deleted successfully" });
    } catch (err) {
        next(err);
    }
};

/**
 * Get inventory summary for seller
 * GET /api/products/seller/inventory
 */
exports.getInventorySummary = async (req, res, next) => {
    try {
        const sellerId = req.user._id;

        // Count products by status
        const totalProducts = await Product.countDocuments({
            sellerId,
            listingStatus: { $ne: "deleted" },
        });

        const activeProducts = await Product.countDocuments({
            sellerId,
            listingStatus: "active",
        });

        // Low stock products (quantity < lowStockThreshold)
        const lowStockProducts = await Product.find({
            sellerId,
            listingStatus: { $ne: "deleted" },
            $expr: { $lt: ["$quantity", "$lowStockThreshold"] },
        }).select("title quantity lowStockThreshold").lean();

        // Out of stock products
        const outOfStock = await Product.countDocuments({
            sellerId,
            listingStatus: { $ne: "deleted" },
            quantity: 0,
        });

        return res.json({
            data: {
                totalProducts,
                activeProducts,
                lowStockCount: lowStockProducts.length,
                lowStockProducts,
                outOfStock,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get low stock products
 * GET /api/products/seller/low-stock
 */
exports.getLowStockProducts = async (req, res, next) => {
    try {
        const sellerId = req.user._id;

        const lowStockProducts = await Product.find({
            sellerId,
            listingStatus: { $ne: "deleted" },
            $expr: { $lt: ["$quantity", "$lowStockThreshold"] },
        })
            .sort({ quantity: 1 })
            .populate("categoryId", "name slug")
            .lean();

        return res.json({ data: lowStockProducts });
    } catch (err) {
        next(err);
    }
};
