const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const verifiedBadgeController = require("../controller/verifiedBadgeController");

// Public: Buyer xem badge của seller
router.get("/seller/:sellerId", verifiedBadgeController.getSellerBadge);

// Protected (seller): Xem badge của chính mình (bao gồm lý do thu hồi nếu có)
router.get("/my-badge", protectedRoute, verifiedBadgeController.getMyBadge);

// Admin: Force recalculate badge cho 1 seller
router.post("/seller/:sellerId/recalculate", protectedRoute, verifiedBadgeController.recalculateSellerBadge);

// Admin: Trigger full check cho toàn bộ sellers
router.post("/recalculate-all", protectedRoute, verifiedBadgeController.recalculateAllBadges);

module.exports = router;
