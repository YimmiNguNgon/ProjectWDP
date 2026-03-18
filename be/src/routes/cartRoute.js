const express = require("express");
const cartCtrl = require("../controller/cartController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protectedRoute, cartCtrl.addToCart);
router.patch("/item/:itemId", protectedRoute, cartCtrl.updateCartItemQuantity);
router.patch("/item/:itemId/save-for-later", protectedRoute, cartCtrl.toggleSaveForLater);
router.delete("/item/:itemId", protectedRoute, cartCtrl.deleteCartItem);
router.get("/", protectedRoute, cartCtrl.getMyCart);

module.exports = router;
