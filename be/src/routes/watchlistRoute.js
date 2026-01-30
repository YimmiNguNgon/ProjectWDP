const express = require("express");
const watchlistCtrl = require("../controller/watchlistController.js");
const { protectedRoute } = require("../middleware/authMiddleware.js");
const router = express.Router();

router.post(
  "/toggle-watchlist/:productId",
  protectedRoute,
  watchlistCtrl.toggleWatchlist,
);

router.get(
  "/get-user-watchlist",
  protectedRoute,
  watchlistCtrl.getUserWatchlist,
);

router.get(
  "/get-watch-count/:productId",
  protectedRoute,
  watchlistCtrl.getWatchCount,
);

module.exports = router;
