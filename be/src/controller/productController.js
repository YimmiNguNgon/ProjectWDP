const Category = require("../models/Category");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const {
  normalizeVariantCombinations,
  syncProductStockFromVariants,
} = require("../utils/productInventory");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    if (!title || price == null || !categoryId) {
      return res
        .status(400)
        .json({ message: "title, price and categoryId required" });
    }

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

    const { categories, minPrice, maxPrice, search, sort } = req.query;
    const seller = String(req.query.seller || "").trim();
    const minRating = req.query.minRating;
    const andConditions = [
      {
        $or: [
          { listingStatus: "active" }, // Show active listings
          { listingStatus: { $exists: false } }, // Show products without listingStatus field (legacy)
        ],
      },
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }, // Exclude soft-deleted
    ];

    // Search filter - search in title and description
    if (search) {
      const safeSearch = escapeRegex(search);
      andConditions.push({
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { description: { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    if (categories) {
      const categorySlugs = String(categories)
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);

      if (categorySlugs.length > 0) {
        const categoryDocs = await Category.find({
          slug: { $in: categorySlugs },
        }).select("_id");

        if (categoryDocs.length > 0) {
          andConditions.push({
            categoryId: {
              $in: categoryDocs.map((c) => c._id),
            },
          });
        } else {
          // If categories specified but found none, match nothing
          andConditions.push({ categoryId: { $in: [] } });
        }
      }
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter = {};
      if (minPrice !== undefined) {
        priceFilter.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        priceFilter.$lte = parseFloat(maxPrice);
      }
      andConditions.push({ price: priceFilter });
    }

    // Rating filter
    if (minRating !== undefined) {
      andConditions.push({ averageRating: { $gte: parseFloat(minRating) } });
    }

    // Seller filter
    if (seller) {
      if (!mongoose.isValidObjectId(seller)) {
        andConditions.push({ _id: { $in: [] } });
      } else {
        andConditions.push({ sellerId: seller });
      }
    }

    let sortOptions = { averageRating: -1, createdAt: -1 };
    if (sort === "price_asc") sortOptions = { price: 1, createdAt: -1 };
    else if (sort === "price_desc") sortOptions = { price: -1, createdAt: -1 };
    else if (sort === "name_asc") sortOptions = { title: 1, createdAt: -1 };
    else if (sort === "name_desc") sortOptions = { title: -1, createdAt: -1 };
    else if (sort === "newest") sortOptions = { createdAt: -1 };

    const filter = andConditions.length ? { $and: andConditions } : {};

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sortOptions)
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
