/**
 * recentlyViewedController.js
 * Handles Recently Viewed Products logic.
 *
 * Rules:
 *  - Max 20 products per user stored.
 *  - Viewing an already-stored product updates its viewedAt timestamp.
 *  - Oldest entries are pruned when exceeding the limit.
 *  - GET returns up to 20 items sorted by viewedAt descending.
 */

const RecentlyViewed = require("../models/RecentlyViewed");
const mongoose = require("mongoose");

const MAX_LIMIT = 20;

// ── POST /api/recently-viewed ─────────────────────────────────────────────────
/**
 * Record (or refresh) a product view for the authenticated user.
 * Body: { productId }
 */
exports.trackView = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Valid productId is required" });
    }

    // Upsert: if exists → update viewedAt; if not → create new
    await RecentlyViewed.findOneAndUpdate(
      { user: userId, product: productId },
      { $set: { viewedAt: new Date() } },
      { upsert: true, new: true }
    );

    // Prune: keep only the newest MAX_LIMIT records for this user
    const allIds = await RecentlyViewed.find({ user: userId })
      .sort({ viewedAt: -1 })
      .select("_id")
      .lean();

    if (allIds.length > MAX_LIMIT) {
      const idsToDelete = allIds.slice(MAX_LIMIT).map((d) => d._id);
      await RecentlyViewed.deleteMany({ _id: { $in: idsToDelete } });
    }

    return res.status(200).json({ message: "View tracked" });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/recently-viewed ──────────────────────────────────────────────────
/**
 * Get the authenticated user's recently viewed products.
 * Query: ?limit=20 (max 20)
 */
exports.getMyRecentlyViewed = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(MAX_LIMIT, parseInt(req.query.limit) || MAX_LIMIT);

    const items = await RecentlyViewed.find({ user: userId })
      .sort({ viewedAt: -1 })
      .limit(limit)
      .populate({
        path: "product",
        select: "title price images image isOnSale discountPercent originalPrice listingStatus variants",
      })
      .lean();

    // Filter out deleted / unpublished products
    const results = items
      .filter((item) => item.product) // product may have been deleted
      .map((item) => ({
        _id: item._id,
        viewedAt: item.viewedAt,
        product: item.product,
      }));

    return res.json({ data: results, total: results.length });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/recently-viewed/:productId ────────────────────────────────────
/**
 * Remove a single product from the user's recently viewed list.
 */
exports.removeOne = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid productId" });
    }

    await RecentlyViewed.findOneAndDelete({ user: userId, product: productId });
    return res.json({ message: "Removed from recently viewed" });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/recently-viewed ───────────────────────────────────────────────
/**
 * Clear all recently viewed products for the authenticated user.
 */
exports.clearAll = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await RecentlyViewed.deleteMany({ user: userId });
    return res.json({ message: "Recently viewed history cleared" });
  } catch (err) {
    next(err);
  }
};
