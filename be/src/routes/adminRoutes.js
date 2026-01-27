// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminUserController = require("../controller/adminUserController");
const adminDashboardController = require("../controller/adminDashboardController");
const adminProductController = require("../controller/adminProductController");
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

module.exports = router;
