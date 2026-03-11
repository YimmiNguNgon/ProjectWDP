const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/recentlyViewedController");

// All routes require authentication
// POST /api/recently-viewed          – track a product view
router.post("/", protectedRoute, ctrl.trackView);

// GET /api/recently-viewed           – fetch user's recently viewed list
router.get("/", protectedRoute, ctrl.getMyRecentlyViewed);

// DELETE /api/recently-viewed        – clear entire history
router.delete("/", protectedRoute, ctrl.clearAll);

// DELETE /api/recently-viewed/:productId – remove a single product
router.delete("/:productId", protectedRoute, ctrl.removeOne);

module.exports = router;
