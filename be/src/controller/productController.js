const Category = require("../models/Category");
const Product = require("../models/Product");
const {
  normalizeVariantCombinations,
  syncProductStockFromVariants,
} = require("../utils/productInventory");

exports.createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      quantity,
      condition,
      categoryId,
      image,
      images,
      variants,
      variantCombinations,
    } = req.body;
    const sellerId = req.user ? req.user._id : req.body.sellerId;
    if (!sellerId)
      return res.status(400).json({ message: "sellerId required" });
    if (!title || price == null)
      return res.status(400).json({ message: "title and price required" });

    const normalizedCombinations = normalizeVariantCombinations(
      variantCombinations,
    );
    const p = new Product({
      sellerId,
      title,
      description,
      price,
      quantity: quantity || 0,
      stock: quantity || 0,
      condition: condition || "",
      categoryId,
      image: image || "",
      images: images || [],
      variants: variants || [],
      variantCombinations: normalizedCombinations,
    });
    syncProductStockFromVariants(p);
    await p.save();
    return res.status(201).json({ data: p });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.productId).lean();
    if (!p) return res.status(404).json({ message: "Product not found" });
    return res.json({ data: p });
  } catch (err) {
    next(err);
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const { categories, minPrice, maxPrice, search } = req.query;

    const filter = {
      $or: [
        { listingStatus: "active" }, // Show active listings
        { listingStatus: { $exists: false } }, // Show products without listingStatus field (legacy)
      ],
      $and: [
        { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }, // Exclude soft-deleted
      ],
    };

    // Search filter - search in title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (categories) {
      const categorySlugs = categories.split(",");

      const categoryDocs = await Category.find({
        slug: { $in: categorySlugs },
      }).select("_id");

      if (categoryDocs.length > 0) {
        filter.categoryId = {
          $in: categoryDocs.map((c) => c._id),
        };
      } else {
        // If categories specified but found none, match nothing
        filter.categoryId = { $in: [] };
      }
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        filter.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        filter.price.$lte = parseFloat(maxPrice);
      }
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ averageRating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("categoryId", "name slug")
      .populate("sellerId", "username avatarUrl")
      .lean();
    return res.json({ page, limit, total, data: products });
  } catch (err) {
    next(err);
  }
};
