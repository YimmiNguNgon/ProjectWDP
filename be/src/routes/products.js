const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/productController");
const sellerCtrl = require("../controller/sellerProductController");

// Seller-specific routes (must come before /:productId)
router.get("/seller/my-listings", protectedRoute, sellerCtrl.getMyListings);
router.get("/seller/inventory", protectedRoute, sellerCtrl.getInventorySummary);
router.get("/seller/low-stock", protectedRoute, sellerCtrl.getLowStockProducts);

// Product management
router.post("/", protectedRoute, ctrl.createProduct); // seller creates product
router.put("/:productId", protectedRoute, sellerCtrl.updateProduct); // seller updates product
router.patch("/:productId/status", protectedRoute, sellerCtrl.updateListingStatus); // update listing status
router.delete("/:productId", protectedRoute, sellerCtrl.deleteProduct); // soft delete

// Public routes
router.get("/:productId", ctrl.getProduct);
router.get("/", ctrl.listProducts);

module.exports = router;
