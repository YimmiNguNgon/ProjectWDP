// src/controllers/adminProductController.js
const mongoose = require("mongoose");
const Product = require("../models/Product");

/**
 * @desc Lấy tất cả sản phẩm với phân trang và lọc
 * @route GET /api/admin/products
 * @access Admin only
 */
exports.getAllProducts = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        let query = {};

        // Filter by seller
        if (req.query.sellerId) {
            query.sellerId = req.query.sellerId;
        }

        // Filter by category
        if (req.query.categoryId) {
            query.categories = req.query.categoryId;
        }

        // Search by title
        if (req.query.search && req.query.search.trim()) {
            query.title = { $regex: req.query.search.trim(), $options: "i" };
        }

        // Filter by price range
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
        }

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate("sellerId", "username email")
            .populate("categoryId", "name description")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get inventories for all products
        const productIds = products.map(p => p._id);
        const Inventory = mongoose.connection.db.collection("inventories");
        const inventories = await Inventory.find({
            productId: { $in: productIds }
        }).toArray();

        // Create inventory map for quick lookup
        const inventoryMap = {};
        inventories.forEach(inv => {
            inventoryMap[inv.productId.toString()] = inv.quantity;
        });

        // Get reviews and calculate ratings for all products
        const Reviews = mongoose.connection.db.collection("reviews");
        const reviews = await Reviews.find({
            productId: { $in: productIds },
            rating: { $exists: true, $ne: null } // Only reviews with rating
        }).toArray();

        // Calculate rating stats for each product
        const ratingMap = {};
        reviews.forEach(review => {
            const productId = review.productId.toString();
            if (!ratingMap[productId]) {
                ratingMap[productId] = { total: 0, count: 0 };
            }
            ratingMap[productId].total += review.rating;
            ratingMap[productId].count += 1;
        });

        // Normalize products with inventory and rating data
        const normalizedProducts = products.map(product => {
            const productId = product._id.toString();
            const ratingStats = ratingMap[productId];
            const averageRating = ratingStats ? ratingStats.total / ratingStats.count : 0;
            const ratingCount = ratingStats ? ratingStats.count : 0;

            return {
                ...product,
                quantity: inventoryMap[productId] ?? 0, // Stock from inventories
                averageRating: averageRating,
                ratingCount: ratingCount,
                status: product.status || "available",
                condition: product.condition || "",
                images: product.images || (product.image ? [product.image] : []),
            };
        });

        return res.json({
            success: true,
            data: normalizedProducts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("Error in getAllProducts:", err);
        return next(err);
    }
};

/**
 * @desc Lấy chi tiết sản phẩm
 * @route GET /api/admin/products/:id
 * @access Admin only
 */
exports.getProductDetail = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }

        const product = await Product.findById(id)
            .populate("sellerId", "username email")
            .populate("categoryId", "name")
            .lean();

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.json({
            success: true,
            data: product,
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * @desc Xóa sản phẩm
 * @route DELETE /api/admin/products/:id
 * @access Admin only
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await Product.findByIdAndDelete(id);

        return res.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * @desc Cập nhật thông tin sản phẩm
 * @route PUT /api/admin/products/:id
 * @access Admin only
 */
exports.updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, price, stock, quantity } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Update fields if provided
        if (title) product.title = title;
        if (description) product.description = description;
        if (price !== undefined) product.price = price;
        if (stock !== undefined) product.quantity = stock; // Map stock to quantity
        if (quantity !== undefined) product.quantity = quantity;

        await product.save();

        return res.json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (err) {
        return next(err);
    }
};
