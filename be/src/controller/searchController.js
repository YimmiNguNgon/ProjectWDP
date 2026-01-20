const Product = require("../models/Product");
const User = require("../models/User");

/**
 * Search products by name, price, and rating
 * Query parameters:
 * - q: search keyword (searches in title and description)
 * - minPrice: minimum price
 * - maxPrice: maximum price
 * - minRating: minimum average rating
 * - page: page number (default 1)
 * - limit: results per page (default 20, max 100)
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Search by keyword in title and description
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    // Price filter
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        filter.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        filter.price.$lte = parseFloat(maxPrice);
      }
    }

    // Rating filter
    const minRating = req.query.minRating;
    if (minRating !== undefined) {
      filter.averageRating = { $gte: parseFloat(minRating) };
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ averageRating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sellerId", "username avatarUrl")
      .populate("categoryId", "name slug")
      .lean();

    return res.json({
      page,
      limit,
      total,
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Search sellers by name
 * Query parameters:
 * - q: search keyword (searches in username and email)
 * - page: page number (default 1)
 * - limit: results per page (default 20, max 100)
 */
exports.searchSellers = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {
      role: { $in: ["seller", "admin"] },
      status: "active",
    };

    // Search by keyword in username
    if (q) {
      filter.username = { $regex: q, $options: "i" };
    }

    const total = await User.countDocuments(filter);
    const sellers = await User.find(filter)
      .select("_id username avatarUrl reputationScore")
      .sort({ reputationScore: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      page,
      limit,
      total,
      data: sellers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Global search that returns both products and sellers
 * Query parameters:
 * - q: search keyword
 * - productLimit: number of products to return (default 10)
 * - sellerLimit: number of sellers to return (default 5)
 */
exports.globalSearch = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const productLimit = Math.min(parseInt(req.query.productLimit) || 10, 50);
    const sellerLimit = Math.min(parseInt(req.query.sellerLimit) || 5, 20);

    // Search products
    const productFilter = {};
    if (q) {
      productFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const products = await Product.find(productFilter)
      .sort({ averageRating: -1, createdAt: -1 })
      .limit(productLimit)
      .populate("sellerId", "username avatarUrl")
      .populate("categoryId", "name slug")
      .lean();

    // Search sellers
    const sellerFilter = {
      role: { $in: ["seller", "admin"] },
      status: "active",
    };
    if (q) {
      sellerFilter.username = { $regex: q, $options: "i" };
    }

    const sellers = await User.find(sellerFilter)
      .select("_id username avatarUrl reputationScore")
      .sort({ reputationScore: -1 })
      .limit(sellerLimit)
      .lean();

    return res.json({
      data: {
        products,
        sellers,
      },
    });
  } catch (err) {
    next(err);
  }
};
