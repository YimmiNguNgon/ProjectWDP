// src/controllers/adminProductController.js
const mongoose = require("mongoose");
const Product = require("../models/Product");

const resolveProductQuantity = (product) => {
    if (Array.isArray(product.variantCombinations) && product.variantCombinations.length > 0) {
        return product.variantCombinations.reduce(
            (sum, combo) => sum + (Number(combo?.quantity) || 0),
            0,
        );
    }

    const quantity = Number(product.quantity);
    if (Number.isFinite(quantity)) return quantity;

    const stock = Number(product.stock);
    if (Number.isFinite(stock)) return stock;

    return 0;
};

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

        // Get reviews and calculate ratings for all products
        const productIds = products.map((p) => p._id);
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
                quantity: resolveProductQuantity(product),
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

        const normalizedProduct = {
            ...product,
            quantity: resolveProductQuantity(product),
            images: product.images || (product.image ? [product.image] : []),
        };

        return res.json({
            success: true,
            data: normalizedProduct,
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
        const {
            title,
            description,
            price,
            stock,
            quantity,
            categoryId,
            sellerId,
            condition,
            status,
            images
        } = req.body;

        console.log('Update product request:', { id, quantity, stock });

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
        if (categoryId) product.categoryId = categoryId;
        if (sellerId) product.sellerId = sellerId;
        if (condition) product.condition = condition;
        if (status) product.status = status;
        if (images !== undefined) {
            product.images = images;
            product.image = images && images.length > 0 ? images[0] : "";
        }

        // Update quantity in both product and inventory
        const newQuantity = quantity !== undefined ? quantity : (stock !== undefined ? stock : null);
        console.log('New quantity:', newQuantity);

        if (newQuantity !== null) {
            product.quantity = newQuantity;
            product.stock = newQuantity;

            // Update inventory collection
            const Inventory = mongoose.connection.db.collection("inventories");
            const productObjectId = new mongoose.Types.ObjectId(id);

            const updateResult = await Inventory.updateOne(
                { productId: productObjectId },
                {
                    $set: {
                        quantity: newQuantity,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );

            console.log('Inventory update result:', updateResult);
        }

        await product.save();

        return res.json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (err) {
        console.error('Error updating product:', err);
        return next(err);
    }
};

/**
 * @desc Tạo sản phẩm mới
 * @route POST /api/admin/products
 * @access Admin only
 */
exports.createProduct = async (req, res, next) => {
    try {
        const {
            title,
            description,
            price,
            quantity,
            categoryId,
            sellerId,
            condition,
            status,
            images,
            isAuction,
            auctionEndTime
        } = req.body;

        // Validate required fields
        if (!title || !description || !price || !categoryId || !sellerId) {
            return res.status(400).json({
                message: "Missing required fields: title, description, price, categoryId, sellerId"
            });
        }

        // Validate categoryId
        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ message: "Invalid category id" });
        }

        // Validate sellerId
        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid seller id" });
        }

        // Create new product
        const newProduct = new Product({
            title,
            description,
            price,
            quantity: quantity || 0,
            stock: quantity || 0,
            categoryId,
            sellerId,
            condition: condition || "new",
            status: status || "available",
            images: images || [],
            image: images && images.length > 0 ? images[0] : "",
            isAuction: isAuction || false,
            auctionEndTime: auctionEndTime || null,
            averageRating: 0,
            ratingCount: 0
        });

        await newProduct.save();

        // Create inventory record
        const Inventory = mongoose.connection.db.collection("inventories");
        await Inventory.insertOne({
            productId: newProduct._id,
            quantity: quantity || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Populate seller and category info
        await newProduct.populate("sellerId", "username email");
        await newProduct.populate("categoryId", "name description");

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: newProduct,
        });
    } catch (err) {
        console.error("Error in createProduct:", err);
        return next(err);
    }
};
