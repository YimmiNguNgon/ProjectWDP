const express = require("express");
const reviewController = require("../controller/reviewController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

// Public routes
router.get("/product/:productId", reviewController.listReviewsByProduct);
router.get("/seller/:sellerId", reviewController.listReviewsBySeller);
router.get("/admin/all", protectedRoute, reviewController.getAdminReviews);

// Seller: xem và phản hồi reviews của mình (đặt TRƯỚC /:reviewId)
router.get("/seller/my-reviews", protectedRoute, reviewController.getMySellerReviews);
router.post("/:reviewId/seller-response", protectedRoute, reviewController.addSellerResponse);

// Protected routes
router.post("/", protectedRoute, reviewController.createReview);
router.post("/:reviewId/flag", protectedRoute, reviewController.flagReview);
router.get("/:reviewId", reviewController.getReviewDetail);

// Admin routes
router.delete("/:reviewId", protectedRoute, reviewController.adminDeleteReview);

module.exports = router;

