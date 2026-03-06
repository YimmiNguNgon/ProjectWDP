const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const { withAuditLog } = require("../middleware/auditLogMiddleware");
const ctrl = require("../controller/productController");
const sellerCtrl = require("../controller/sellerProductController");
const Product = require("../models/Product");

// Public routes (đặt trước các route có params để tránh conflict)
router.get("/", ctrl.listProducts);

// Seller-specific routes (đặt trước /:productId)
router.get("/seller/my-listings", protectedRoute, sellerCtrl.getMyListings);
router.get("/seller/inventory", protectedRoute, sellerCtrl.getInventorySummary);
router.get("/seller/low-stock", protectedRoute, sellerCtrl.getLowStockProducts);

// Product CRUD
router.post(
  "/",
  protectedRoute,
  withAuditLog({
    resourceType: "product",
    model: Product,
    actorRoles: ["seller", "admin"],
    action: "create",
  }),
  sellerCtrl.createProduct,
); // có PROBATION check
router.get("/:productId", ctrl.getProduct);
router.put(
  "/:productId",
  protectedRoute,
  withAuditLog({
    resourceType: "product",
    model: Product,
    resourceIdParam: "productId",
    actorRoles: ["seller", "admin"],
    action: "update",
  }),
  sellerCtrl.updateProduct,
);
router.patch(
  "/:productId/status",
  protectedRoute,
  withAuditLog({
    resourceType: "product",
    model: Product,
    resourceIdParam: "productId",
    actorRoles: ["seller", "admin"],
    action: "status_change",
  }),
  sellerCtrl.updateListingStatus,
);
router.delete(
  "/:productId",
  protectedRoute,
  withAuditLog({
    resourceType: "product",
    model: Product,
    resourceIdParam: "productId",
    actorRoles: ["seller", "admin"],
    action: "delete",
  }),
  sellerCtrl.deleteProduct,
);

module.exports = router;
