// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminUserController = require("../controller/adminUserController");
const adminDashboardController = require("../controller/adminDashboardController");
const adminProductController = require("../controller/adminProductController");
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
