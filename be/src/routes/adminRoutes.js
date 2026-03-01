// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminUserController = require("../controller/adminUserController");
const adminDashboardController = require("../controller/adminDashboardController");
const adminProductController = require("../controller/adminProductController");
const adminCategoryController = require("../controller/adminCategoryController");
const sellerApplicationController = require("../controller/sellerApplicationController");
const notificationService = require("../services/notificationService");
const User = require("../models/User");
const { protectedRoute } = require("../middleware/authMiddleware");

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin only" });
    }
    next();
};

// Apply authentication and admin check to all routes
router.use(protectedRoute);
router.use(isAdmin);

// Dashboard routes
router.get("/dashboard/stats", adminDashboardController.getDashboardStats);

// User management routes
router.get("/users", adminUserController.getAllUsers);
router.get("/users/:id", adminUserController.getUserDetail);
router.put("/users/:id", adminUserController.updateUser);
router.delete("/users/:id", adminUserController.deleteUser);
router.post("/users/:id/ban", adminUserController.banUser);
router.post("/users/:id/unban", adminUserController.unbanUser);

// Product management routes
router.get("/products", adminProductController.getAllProducts);
router.post("/products", adminProductController.createProduct);
router.get("/products/:id", adminProductController.getProductDetail);
router.put("/products/:id", adminProductController.updateProduct);
router.delete("/products/:id", adminProductController.deleteProduct);

// Category management routes
router.get("/categories", adminCategoryController.getAllCategories);
router.post("/categories", adminCategoryController.createCategory);
router.get("/categories/:id", adminCategoryController.getCategoryDetail);
router.put("/categories/:id", adminCategoryController.updateCategory);
router.delete("/categories/:id", adminCategoryController.deleteCategory);

// Report product - gửi cảnh báo tới seller
router.post("/products/:id/report", async (req, res, next) => {
    try {
        const Product = require("../models/Product");
        const { reason, message } = req.body;
        if (!reason) {
            return res.status(400).json({ message: "Lý do báo cáo là bắt buộc" });
        }
        const product = await Product.findById(req.params.id).lean();
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        await notificationService.sendNotification({
            recipientId: product.sellerId,
            type: "product_warning",
            title: `Cảnh báo sản phẩm: ${product.title}`,
            body: `[Admin] Lý do: ${reason}${message ? '. ' + message : ''}`,
            link: `/seller/products`,
            metadata: {
                productId: product._id,
                fromAdmin: req.user.username,
                reason,
            },
        });
        return res.json({ ok: true, message: "Đã gửi cảnh báo tới seller" });
    } catch (err) {
        next(err);
    }
});

// Seller application management routes
router.get("/seller-applications", sellerApplicationController.getAllApplications);
router.post("/seller-applications/:id/approve", sellerApplicationController.approveApplication);
router.post("/seller-applications/:id/reject", sellerApplicationController.rejectApplication);

// Broadcast notification to all users
router.post("/notifications/broadcast", async (req, res, next) => {
    try {
        const { title, body, link = "/" } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: "title va body la bat buoc" });
        }

        // Lay tat ca user (tru admin)
        const users = await User.find({ status: "active" }).select("_id").lean();
        const recipientIds = users.map(u => u._id);

        await notificationService.sendBroadcast({
            recipientIds,
            type: "admin_broadcast",
            title,
            body,
            link,
            metadata: { fromAdmin: req.user.username },
        });

        return res.json({ ok: true, sentTo: recipientIds.length });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
