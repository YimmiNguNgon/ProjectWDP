const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const {
  normalizeVariantCombinations,
  syncProductStockFromVariants,
} = require("../utils/productInventory");

const PROBATION_LIMITS = {
  MAX_PRODUCTS_PER_DAY: 5,
};

async function countProductsCreatedToday(sellerId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return Product.countDocuments({
    sellerId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    listingStatus: { $ne: "deleted" },
  });
}

exports.createProduct = async (req, res, next) => {
  try {
    const seller = req.user;
    const sellerId = seller._id;
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

    if (!title || price == null || !categoryId) {
      return res
        .status(400)
        .json({ message: "title, price and categoryId required" });
    }

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (seller.sellerStage === "PROBATION") {
      const todayCount = await countProductsCreatedToday(sellerId);
      if (todayCount >= PROBATION_LIMITS.MAX_PRODUCTS_PER_DAY) {
        return res.status(429).json({
          message: `Tai khoan PROBATION chi duoc dang toi da ${PROBATION_LIMITS.MAX_PRODUCTS_PER_DAY} san pham/ngay. Ban da dang ${todayCount} san pham hom nay.`,
          probationLimit: true,
          limit: PROBATION_LIMITS.MAX_PRODUCTS_PER_DAY,
          todayCount,
        });
      }
    }

    const normalizedCombinations = normalizeVariantCombinations(
      variantCombinations,
    );

    const product = new Product({
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

    syncProductStockFromVariants(product);
    await product.save();

    return res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
};

exports.getMyListings = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = { sellerId };

    if (status && status !== "all") {
      filter.listingStatus = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("categoryId", "name slug")
      .lean();

    const seller = req.user;
    const probationInfo =
      seller.sellerStage === "PROBATION"
        ? {
            isProbation: true,
            todayCount: await countProductsCreatedToday(sellerId),
            dailyLimit: PROBATION_LIMITS.MAX_PRODUCTS_PER_DAY,
          }
        : null;

    return res.json({
      page: parsedPage,
      limit: parsedLimit,
      total,
      data: products,
      probationInfo,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const sellerId = req.user._id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this product" });
    }

    if (req.body.categoryId !== undefined) {
      if (!mongoose.isValidObjectId(req.body.categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const categoryExists = await Category.exists({ _id: req.body.categoryId });
      if (!categoryExists) {
        return res.status(404).json({ message: "Category not found" });
      }
    }

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
      lowStockThreshold,
    } = req.body;

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (quantity !== undefined) product.quantity = quantity;
    if (condition !== undefined) product.condition = condition;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (image !== undefined) product.image = image;
    if (images !== undefined) product.images = images;
    if (variants !== undefined) product.variants = variants;

    if (variantCombinations !== undefined) {
      product.variantCombinations = normalizeVariantCombinations(
        variantCombinations,
      );
      syncProductStockFromVariants(product);
    }

    if (lowStockThreshold !== undefined) {
      product.lowStockThreshold = lowStockThreshold;
    }

    if (quantity !== undefined && variantCombinations === undefined) {
      product.quantity = Number(quantity) || 0;
      product.stock = Number(quantity) || 0;
    }

    product.updatedAt = new Date();
    await product.save();

    const updated = await Product.findById(productId)
      .populate("categoryId", "name slug")
      .lean();

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

exports.updateListingStatus = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const sellerId = req.user._id;
    const { listingStatus } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const validStatuses = ["active", "paused", "ended"];
    if (!validStatuses.includes(listingStatus)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this product" });
    }

    if (product.listingStatus === "deleted") {
      return res.status(400).json({ message: "Cannot modify deleted listings" });
    }

    product.listingStatus = listingStatus;
    product.updatedAt = new Date();
    await product.save();

    return res.json({
      message: `Listing status updated to ${listingStatus}`,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const sellerId = req.user._id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    product.listingStatus = "deleted";
    product.deletedAt = new Date();
    product.updatedAt = new Date();
    await product.save();

    return res.json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getInventorySummary = async (req, res, next) => {
  try {
    const sellerId = req.user._id;

    const totalProducts = await Product.countDocuments({
      sellerId,
      listingStatus: { $ne: "deleted" },
    });

    const activeProducts = await Product.countDocuments({
      sellerId,
      listingStatus: "active",
    });

    const lowStockProducts = await Product.find({
      sellerId,
      listingStatus: { $ne: "deleted" },
      $expr: { $lt: ["$quantity", "$lowStockThreshold"] },
    })
      .select("title quantity lowStockThreshold")
      .lean();

    const outOfStock = await Product.countDocuments({
      sellerId,
      listingStatus: { $ne: "deleted" },
      quantity: 0,
    });

    return res.json({
      data: {
        totalProducts,
        activeProducts,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        outOfStock,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getLowStockProducts = async (req, res, next) => {
  try {
    const sellerId = req.user._id;

    const lowStockProducts = await Product.find({
      sellerId,
      listingStatus: { $ne: "deleted" },
      $expr: { $lt: ["$quantity", "$lowStockThreshold"] },
    })
      .sort({ quantity: 1 })
      .populate("categoryId", "name slug")
      .lean();

    return res.json({ data: lowStockProducts });
  } catch (err) {
    next(err);
  }
};
