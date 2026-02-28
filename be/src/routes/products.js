const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/productController");
const sellerCtrl = require("../controller/sellerProductController");

// Public routes (đặt trước các route có params để tránh conflict)
router.get("/", ctrl.listProducts);

// Seller-specific routes (đặt trước /:productId)
router.get("/seller/my-listings", protectedRoute, sellerCtrl.getMyListings);
router.get("/seller/inventory", protectedRoute, sellerCtrl.getInventorySummary);
router.get("/seller/low-stock", protectedRoute, sellerCtrl.getLowStockProducts);

// Product CRUD
router.post("/", protectedRoute, sellerCtrl.createProduct); // có PROBATION check
router.get("/:productId", ctrl.getProduct);
router.put("/:productId", protectedRoute, sellerCtrl.updateProduct);
router.patch("/:productId/status", protectedRoute, sellerCtrl.updateListingStatus);
router.delete("/:productId", protectedRoute, sellerCtrl.deleteProduct);

module.exports = router;
