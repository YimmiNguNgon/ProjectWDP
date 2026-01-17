const express = require("express");
const reviewController = require("../controller/reviewController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

// Public routes
router.get("/product/:productId", reviewController.listReviewsByProduct);
router.get("/seller/:sellerId", reviewController.listReviewsBySeller);
router.get("/:reviewId", reviewController.getReviewDetail);

// Protected routes (require authentication)
router.post("/", protectedRoute, reviewController.createReview);
router.post("/:reviewId/flag", protectedRoute, reviewController.flagReview);

// Admin routes (admin check is done in controller)
router.delete("/:reviewId", protectedRoute, reviewController.adminDeleteReview);
router.get("/admin/all", protectedRoute, reviewController.getAdminReviews);

module.exports = router;
