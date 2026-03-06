const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const trustScoreController = require("../controller/trustScoreController");

// Public: Buyer xem Trust Score của seller
router.get("/seller/:sellerId", trustScoreController.getSellerTrustScore);

// Seller: Xem điểm của chính mình
router.get("/my-score", protectedRoute, trustScoreController.getMyTrustScore);



// Admin: Trigger recalculate
router.post("/seller/:sellerId/recalculate", protectedRoute, trustScoreController.recalculateSellerTrustScore);
router.post("/recalculate-all", protectedRoute, trustScoreController.recalculateAllSellers);

module.exports = router;
