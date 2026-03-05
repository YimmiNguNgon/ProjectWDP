const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const {
  normalizeVariantCombinations,
  syncProductStockFromVariants,
} = require("../utils/productInventory");
const { decideModerationStatus } = require("../services/sellerTrustService");
const { scanProductText } = require("../utils/productContentFilter");
const {
  calculateDiscountPercent,
  decorateProductPricing,
} = require("../utils/productPricing");
const Watchlist = require("../models/Watchlist");
const notificationService = require("../services/notificationService");
const { hardDeleteProductById } = require("../services/productDeletionService");

const PROBATION_LIMITS = {
  MAX_PRODUCTS_PER_DAY: 5,
};

const toBooleanOrUndefined = (value) => {
  if (value === true || value === false) return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const applyTimedSale = ({
  product,
  basePrice,
  salePrice,
  saleStartDate,
  saleEndDate,
}) => {
  const numericBasePrice = Number(basePrice);
  const numericSalePrice = Number(salePrice);
  const start = toValidDate(saleStartDate);
  const end = toValidDate(saleEndDate);

  if (!Number.isFinite(numericBasePrice) || numericBasePrice <= 0) {
    return { ok: false, message: "Base price must be greater than 0" };
  }
  if (!Number.isFinite(numericSalePrice) || numericSalePrice <= 0) {
    return { ok: false, message: "Sale price must be greater than 0" };
  }
  if (numericSalePrice >= numericBasePrice) {
    return { ok: false, message: "Sale price must be lower than base price" };
  }
  if (!start || !end) {
    return { ok: false, message: "Sale start and end date are required" };
  }
  if (start.getTime() >= end.getTime()) {
    return { ok: false, message: "Sale start date must be before end date" };
  }

  const discountPercent = calculateDiscountPercent(
    numericBasePrice,
    numericSalePrice,
  );

  product.promotionType = "daily_deal";
  product.originalPrice = Number(numericBasePrice.toFixed(2));
  product.price = Number(numericSalePrice.toFixed(2));
  product.discountPercent = discountPercent || null;
  product.dealStartDate = start;
  product.dealEndDate = end;

  return { ok: true };
};

const clearTimedSale = ({ product, fallbackPrice }) => {
  const restoredPrice = Number(fallbackPrice);
  product.promotionType = "normal";
  product.price = Number((Number.isFinite(restoredPrice) ? restoredPrice : 0).toFixed(2));
  product.originalPrice = null;
  product.discountPercent = null;
  product.dealStartDate = null;
  product.dealEndDate = null;
  product.dealQuantityLimit = null;
  product.dealQuantitySold = 0;
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
      saleEnabled,
      salePrice,
      saleStartDate,
      saleEndDate,
    } = req.body;

    if (
      price !== undefined &&
      (!Number.isFinite(Number(price)) || Number(price) <= 0)
    ) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    if (!title || price == null || !categoryId) {
      return res
        .status(400)
        .json({ message: "title, price and categoryId required" });
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    const moderationResult = scanProductText({ title, description });
    if (moderationResult.isBlocked) {
      return res.status(422).json({
        message: moderationResult.reason,
        code: "PRODUCT_CONTENT_BLOCKED",
        matchedTerms: moderationResult.matchedTerms,
      });
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

    // ── Trust Score Moderation (non-breaking) ──────────────────────────────────
    // Mặc định là active. Nếu service lỗi thì fallback về active, không bao giờ block luồng cũ.
    let initialListingStatus = "active";
    let moderationInfo = null;
    try {
      const mod = await decideModerationStatus(sellerId);
      moderationInfo = mod;

      if (mod.listingStatus === "blocked") {
        // Chỉ block HIGH_RISK seller (score < 3.0) và có riskFlagged
        return res.status(403).json({
          message: "Tài khoản của bạn hiện bị khóa do điểm uy tín quá thấp. Vui lòng liên hệ hỗ trợ.",
          tier: mod.tier,
          finalScore: mod.finalScore,
          blocked: true,
        });
      }

      initialListingStatus = mod.listingStatus; // active | pending_review
    } catch (modErr) {
      // Trust Score service lỗi → fallback active, không ảnh hưởng luồng tạo sản phẩm
      console.warn("[TrustScore] decideModerationStatus error (fallback active):", modErr.message);
      initialListingStatus = "active";
    }
    // ──────────────────────────────────────────────────────────────────────────

    const product = new Product({
      sellerId,
      title,
      description,
      price: Number(price),
      quantity: quantity || 0,
      stock: quantity || 0,
      condition: condition || "",
      categoryId,
      image: image || "",
      images: images || [],
      variants: variants || [],
      variantCombinations: normalizedCombinations,
      listingStatus: initialListingStatus,
    });

    const shouldEnableSale = toBooleanOrUndefined(saleEnabled) === true;
    if (shouldEnableSale) {
      const saleResult = applyTimedSale({
        product,
        basePrice: Number(price),
        salePrice,
        saleStartDate,
        saleEndDate,
      });
      if (!saleResult.ok) {
        return res.status(400).json({ message: saleResult.message });
      }
    }

    syncProductStockFromVariants(product);
    await product.save();

    return res.status(201).json({
      data: decorateProductPricing(product.toObject()),
      moderation: moderationInfo ? {
        mode: moderationInfo.mode,
        tier: moderationInfo.tier,
        score: moderationInfo.finalScore,
        status: initialListingStatus,
        message: initialListingStatus === "pending_review"
          ? "Sản phẩm đang chờ admin duyệt do chính sách kiểm duyệt."
          : "Sản phẩm được tự động duyệt.",
      } : null,
    });
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
      data: products.map((product) => decorateProductPricing(product)),
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
      saleEnabled,
      salePrice,
      saleStartDate,
      saleEndDate,
    } = req.body;

    const nextTitle = title !== undefined ? title : product.title;
    const nextDescription =
      description !== undefined ? description : product.description;
    const shouldScanContent =
      (title !== undefined &&
        String(title) !== String(product.title || "")) ||
      (description !== undefined &&
        String(description) !== String(product.description || ""));

    if (shouldScanContent) {
      const moderationResult = scanProductText({
        title: nextTitle,
        description: nextDescription,
      });

      if (moderationResult.isBlocked) {
        return res.status(422).json({
          message: moderationResult.reason,
          code: "PRODUCT_CONTENT_BLOCKED",
          matchedTerms: moderationResult.matchedTerms,
        });
      }
    }

    const hasImportantChanges =
      (title !== undefined && title !== product.title) ||
      (description !== undefined && description !== product.description) ||
      (price !== undefined && price !== product.price);

    const oldTitle = product.title;
    const requestedBasePrice =
      price !== undefined
        ? Number(price)
        : Number(product.originalPrice || product.price || 0);
    const parsedSaleEnabled = toBooleanOrUndefined(saleEnabled);
    const hasExistingTimedSale =
      product.promotionType === "daily_deal" &&
      product.originalPrice &&
      product.dealStartDate &&
      product.dealEndDate;

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (quantity !== undefined) product.quantity = quantity;
    if (condition !== undefined) product.condition = condition;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (image !== undefined) product.image = image;
    if (images !== undefined) product.images = images;
    if (variants !== undefined) product.variants = variants;

    if (parsedSaleEnabled === true) {
      const saleResult = applyTimedSale({
        product,
        basePrice: requestedBasePrice,
        salePrice: salePrice !== undefined ? salePrice : product.price,
        saleStartDate:
          saleStartDate !== undefined ? saleStartDate : product.dealStartDate,
        saleEndDate: saleEndDate !== undefined ? saleEndDate : product.dealEndDate,
      });
      if (!saleResult.ok) {
        return res.status(400).json({ message: saleResult.message });
      }
    } else if (parsedSaleEnabled === false) {
      clearTimedSale({ product, fallbackPrice: requestedBasePrice });
    } else if (price !== undefined) {
      if (hasExistingTimedSale) {
        const currentDiscountPercent = Number(product.discountPercent || 0);
        product.originalPrice = Number(requestedBasePrice.toFixed(2));
        if (currentDiscountPercent > 0 && currentDiscountPercent < 100) {
          product.price = Number(
            (
              requestedBasePrice *
              (1 - currentDiscountPercent / 100)
            ).toFixed(2),
          );
        } else {
          product.price = Number(requestedBasePrice.toFixed(2));
        }
      } else {
        product.price = Number(requestedBasePrice.toFixed(2));
      }
    }

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

    // Send notifications to watchers if important fields changed
    if (hasImportantChanges) {
      try {
        const watchers = await Watchlist.find({
          product: productId,
          isActive: true,
        }).select("user");

        if (watchers.length > 0) {
          const recipientIds = watchers.map((w) => w.user.toString());
          await notificationService.sendBroadcast({
            recipientIds,
            type: "watchlist_product_updated",
            title: "Product Updated",
            body: `An item you are watching "${oldTitle}" has been updated by the seller.`,
            link: `/products/${productId}`,
            metadata: { productId },
          });
        }
      } catch (notifErr) {
        console.error(
          "Failed to send watchlist update notifications:",
          notifErr,
        );
      }
    }

    const updated = await Product.findById(productId)
      .populate("categoryId", "name slug")
      .lean();

    return res.json({ data: decorateProductPricing(updated) });
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

    await hardDeleteProductById(product._id);

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
