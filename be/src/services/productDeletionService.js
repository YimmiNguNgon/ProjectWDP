const mongoose = require("mongoose");
const Product = require("../models/Product");
const CartItem = require("../models/CartItem");
const Watchlist = require("../models/Watchlist");
const PromotionRequest = require("../models/PromotionRequest");
const recalculateCart = require("../utils/cart");

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
};

const hardDeleteProductById = async (productId) => {
  const normalizedProductId = toObjectId(productId);

  const affectedCartIds = await CartItem.distinct("cart", {
    product: normalizedProductId,
  });

  const cleanupTasks = [
    Product.findByIdAndDelete(normalizedProductId),
    CartItem.deleteMany({ product: normalizedProductId }),
    Watchlist.deleteMany({ product: normalizedProductId }),
    PromotionRequest.deleteMany({ product: normalizedProductId }),
  ];

  const inventoryCollection = mongoose.connection?.db?.collection("inventories");
  if (inventoryCollection) {
    cleanupTasks.push(
      inventoryCollection.deleteMany({ productId: normalizedProductId }),
    );
  }

  await Promise.all(cleanupTasks);

  if (affectedCartIds.length > 0) {
    await Promise.all(
      affectedCartIds.map((cartId) => recalculateCart(cartId)),
    );
  }
};

module.exports = {
  hardDeleteProductById,
};
