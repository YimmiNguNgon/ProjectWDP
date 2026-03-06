// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminUserController = require("../controller/adminUserController");
const adminDashboardController = require("../controller/adminDashboardController");
const adminProductController = require("../controller/adminProductController");
const adminCategoryController = require("../controller/adminCategoryController");
const auditLogController = require("../controller/auditLogController");
const sellerApplicationController = require("../controller/sellerApplicationController");
const banAppealController = require("../controller/banAppealController");
const notificationService = require("../services/notificationService");
const { withAuditLog } = require("../middleware/auditLogMiddleware");
const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const SellerApplication = require("../models/SellerApplication");
const BanAppeal = require("../models/BanAppeal");
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
router.get("/audit-logs", auditLogController.getAuditLogs);
router.get("/audit-logs/:id", auditLogController.getAuditLogDetail);

// User management routes
router.get("/users", adminUserController.getAllUsers);
router.get("/users/ban-appeals", banAppealController.getAllAppeals);
router.post(
    "/users/ban-appeals/:id/review",
    withAuditLog({
        resourceType: "ban_appeal",
        model: BanAppeal,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "review",
    }),
    banAppealController.reviewAppeal,
);
router.get("/users/:id", adminUserController.getUserDetail);
router.put(
    "/users/:id",
    withAuditLog({
        resourceType: "user",
        model: User,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "update",
    }),
    adminUserController.updateUser,
);
router.delete(
    "/users/:id",
    withAuditLog({
        resourceType: "user",
        model: User,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "delete",
    }),
    adminUserController.deleteUser,
);
router.post(
    "/users/:id/ban",
    withAuditLog({
        resourceType: "user",
        model: User,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "ban",
    }),
    adminUserController.banUser,
);
router.post(
    "/users/:id/unban",
    withAuditLog({
        resourceType: "user",
        model: User,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "unban",
    }),
    adminUserController.unbanUser,
);

// Product management routes
router.get("/products", adminProductController.getAllProducts);
router.post(
    "/products",
    withAuditLog({
        resourceType: "product",
        model: Product,
        actorRoles: ["admin"],
        action: "create",
    }),
    adminProductController.createProduct,
);
router.get("/products/:id", adminProductController.getProductDetail);
router.put(
    "/products/:id",
    withAuditLog({
        resourceType: "product",
        model: Product,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "update",
    }),
    adminProductController.updateProduct,
);
router.delete(
    "/products/:id",
    withAuditLog({
        resourceType: "product",
        model: Product,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "delete",
    }),
    adminProductController.deleteProduct,
);
router.patch(
    "/products/:id/review",
    withAuditLog({
        resourceType: "product",
        model: Product,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "review",
    }),
    adminProductController.reviewPendingProduct,
);

// Category management routes
router.get("/categories", adminCategoryController.getAllCategories);
router.post(
    "/categories",
    withAuditLog({
        resourceType: "category",
        model: Category,
        actorRoles: ["admin"],
        action: "create",
    }),
    adminCategoryController.createCategory,
);
router.get("/categories/:id", adminCategoryController.getCategoryDetail);
router.put(
    "/categories/:id",
    withAuditLog({
        resourceType: "category",
        model: Category,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "update",
    }),
    adminCategoryController.updateCategory,
);
router.delete(
    "/categories/:id",
    withAuditLog({
        resourceType: "category",
        model: Category,
        resourceIdParam: "id",
        actorRoles: ["admin"],
        action: "delete",
    }),
    adminCategoryController.deleteCategory,
);

// Report product - gửi cảnh báo tới seller
router.post(
  "/products/:id/report",
  withAuditLog({
    resourceType: "product",
    model: Product,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "warning",
  }),
  async (req, res, next) => {
    try {
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
router.post(
  "/seller-applications/:id/approve",
  withAuditLog({
    resourceType: "seller_application",
    model: SellerApplication,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "approve",
  }),
  sellerApplicationController.approveApplication,
);
router.post(
  "/seller-applications/:id/reject",
  withAuditLog({
    resourceType: "seller_application",
    model: SellerApplication,
    resourceIdParam: "id",
    actorRoles: ["admin"],
    action: "reject",
  }),
  sellerApplicationController.rejectApplication,
);

// Broadcast notification to all users
router.post(
  "/notifications/broadcast",
  withAuditLog({
    resourceType: "notification",
    actorRoles: ["admin"],
    action: "broadcast",
  }),
  async (req, res, next) => {
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
