const Cart = require("../models/Cart.js");
const CartItem = require("../models/CartItem.js");
const Product = require("../models/Product.js");
const recalculateCart = require("../utils/cart.js");
const notificationService = require("../services/notificationService");
const {
  buildVariantKey,
  findVariantOption,
  normalizeSelectedVariants,
} = require("../utils/productInventory");
const {
  resolveProductPricing,
  decorateProductPricing,
} = require("../utils/productPricing");

const applyLatestVariantSnapshot = (
  item,
  normalizedVariants,
  variantKey,
  variantCheck,
) => {
  item.selectedVariants = normalizedVariants;
  item.variantKey = variantKey;
  item.variantSku = variantCheck.optionSku || "";
  item.priceSnapShot = Number(variantCheck.optionPrice || 0);
};

const formatUsd = (value) => `$${Number(value || 0).toFixed(2)}`;
const toUnavailableMessage = (label = "This product") =>
  `${label} is currently unavailable`;

const resolveListingAvailability = (product) => {
  if (!product) {
    return {
      unavailable: true,
      reason: "missing",
    };
  }

  const listingStatus = String(product.listingStatus || "").toLowerCase();
  const productStatus = String(product.status || "").toLowerCase();
  const hasDeletedAt = Boolean(product.deletedAt);

  if (hasDeletedAt || listingStatus === "deleted") {
    return { unavailable: true, reason: "deleted" };
  }

  if (listingStatus && listingStatus !== "active") {
    return { unavailable: true, reason: listingStatus };
  }

  if (productStatus && productStatus !== "available") {
    return { unavailable: true, reason: productStatus };
  }

  return { unavailable: false, reason: "ok" };
};

const isProductPurchasable = (product) =>
  !resolveListingAvailability(product).unavailable;

const buildUnavailableProductSnapshot = (item) => ({
  _id: "",
  sellerId: String(item?.seller?._id || ""),
  title: "Unavailable product",
  description: "This product is currently unavailable.",
  price: Number(item?.priceSnapShot || 0),
  stock: 0,
  quantity: 0,
  image: "",
});

exports.getMyCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId, status: "active" }).lean();

    if (!cart) {
      cart = await Cart.create({ user: userId });
    }

    const items = await CartItem.find({ cart: cart._id })
      .populate("product")
      .populate("seller", "username")
      .lean();

    const mappedItems = [];
    const sideEffects = [];

    for (const item of items) {
      const normalizedVariants = normalizeSelectedVariants(
        item.selectedVariants || [],
      );
      const variantKey = buildVariantKey(normalizedVariants);

      if (!item.product) {
        const availabilityMessage = toUnavailableMessage();

        sideEffects.push(
          (async () => {
            const markResult = await CartItem.updateOne(
              { _id: item._id, stockAlertSent: { $ne: true } },
              { $set: { stockAlertSent: true } },
            );
            if (markResult.modifiedCount > 0) {
              await notificationService.sendNotification({
                recipientId: userId,
                type: "cart_item_out_of_stock",
                title: "A cart item is unavailable",
                body: availabilityMessage,
                link: "/cart",
                metadata: {
                  cartItemId: String(item._id),
                  productId: "",
                  variantKey,
                  reason: "deleted",
                },
              });
            }
          })(),
        );

        mappedItems.push({
          ...item,
          product: buildUnavailableProductSnapshot(item),
          selectedVariants: normalizedVariants,
          variantKey,
          variantSku: item.variantSku || "",
          priceSnapShot: Number(item.priceSnapShot || 0),
          originalPriceSnapShot: null,
          isOnSale: false,
          availableStock: 0,
          isOutOfStock: true,
          availabilityStatus: "unavailable",
          availabilityMessage,
        });
        continue;
      }

      const pricedProduct = decorateProductPricing(item.product);
      const variantCheck = findVariantOption(item.product, normalizedVariants);
      const pricingMeta = resolveProductPricing(item.product);
      const listingAvailability = resolveListingAvailability(item.product);
      const isListingUnavailable = listingAvailability.unavailable;
      const isVariantUnavailable = !variantCheck.ok;
      const latestSnapshotPrice = Number(
        variantCheck.ok
          ? variantCheck.optionPrice
          : item.priceSnapShot || item.product?.price || 0,
      );
      const latestVariantSku = variantCheck.ok
        ? variantCheck.optionSku || ""
        : item.variantSku || "";
      const availableStock = Number(
        variantCheck.ok
          ? variantCheck.optionQuantity
          : Number(item.product.quantity || item.product.stock || 0),
      );
      const title = String(item?.product?.title || "Product");
      const isOutOfStock = availableStock <= 0;
      const hasInsufficientStock =
        !isOutOfStock && Number(item.quantity || 0) > availableStock;
      let availabilityStatus = "ok";
      let availabilityMessage = "";

      if (
        item.priceSnapShot !== latestSnapshotPrice ||
        item.variantKey !== variantKey ||
        item.variantSku !== latestVariantSku
      ) {
        sideEffects.push(
          (async () => {
            const updateResult = await CartItem.updateOne(
              {
                _id: item._id,
                $or: [
                  { priceSnapShot: { $ne: latestSnapshotPrice } },
                  { variantKey: { $ne: variantKey } },
                  { variantSku: { $ne: latestVariantSku } },
                ],
              },
              {
                $set: {
                  priceSnapShot: latestSnapshotPrice,
                  selectedVariants: normalizedVariants,
                  variantKey,
                  variantSku: latestVariantSku,
                },
              },
            );

            const hasPriceChanged = item.priceSnapShot !== latestSnapshotPrice;
            if (updateResult.modifiedCount > 0 && hasPriceChanged) {
              const oldPrice = Number(item.priceSnapShot || 0);
              const newPrice = Number(latestSnapshotPrice || 0);
              await notificationService.sendNotification({
                recipientId: userId,
                type: "cart_item_price_changed",
                title: "Price changed in your cart",
                body: `${title} has changed price ${formatUsd(oldPrice)} -> ${formatUsd(newPrice)}, check it now.`,
                link: "/cart",
                metadata: {
                  cartItemId: String(item._id),
                  productId: String(item.product?._id || ""),
                  variantKey,
                  oldPrice,
                  newPrice,
                },
              });
            }
          })(),
        );
      }

      if (isListingUnavailable || isVariantUnavailable || isOutOfStock) {
        availabilityStatus =
          isListingUnavailable || isVariantUnavailable
            ? "unavailable"
            : "out_of_stock";
        availabilityMessage = toUnavailableMessage(`Product ${title}`);

        // Notify once per cart item while it remains unavailable.
        sideEffects.push(
          (async () => {
            const markResult = await CartItem.updateOne(
              { _id: item._id, stockAlertSent: { $ne: true } },
              { $set: { stockAlertSent: true } },
            );
            if (markResult.modifiedCount > 0) {
              await notificationService.sendNotification({
                recipientId: userId,
                type: "cart_item_out_of_stock",
                title: "A cart item is unavailable",
                body: availabilityMessage,
                link: "/cart",
                metadata: {
                  cartItemId: String(item._id),
                  productId: String(item.product?._id || ""),
                  variantKey,
                  reason: isListingUnavailable
                    ? listingAvailability.reason
                    : isVariantUnavailable
                      ? "variant_not_found"
                      : "out_of_stock",
                },
              });
            }
          })(),
        );
      } else if (hasInsufficientStock) {
        availabilityStatus = "insufficient_stock";
        availabilityMessage = `Product ${title} only has ${availableStock} left`;

        sideEffects.push(
          CartItem.updateOne(
            { _id: item._id, stockAlertSent: true },
            { $set: { stockAlertSent: false } },
          ),
        );
      } else {
        sideEffects.push(
          CartItem.updateOne(
            { _id: item._id, stockAlertSent: true },
            { $set: { stockAlertSent: false } },
          ),
        );
      }

      mappedItems.push({
        ...item,
        product: pricedProduct,
        selectedVariants: normalizedVariants,
        variantKey,
        variantSku: latestVariantSku,
        priceSnapShot: latestSnapshotPrice,
        originalPriceSnapShot:
          pricingMeta.isOnSale &&
          Number(pricingMeta.discountPercent || 0) > 0 &&
          Number(pricingMeta.discountPercent || 0) < 100
            ? Number(
                (
                  latestSnapshotPrice /
                  (1 - Number(pricingMeta.discountPercent) / 100)
                ).toFixed(2),
              )
            : null,
        isOnSale: Boolean(pricingMeta.isOnSale),
        availableStock,
        isOutOfStock:
          isOutOfStock || isListingUnavailable || isVariantUnavailable,
        availabilityStatus,
        availabilityMessage,
      });
    }

    const computedTotalItems = mappedItems.reduce(
      (sum, cartItem) => sum + Number(cartItem.quantity || 0),
      0,
    );
    const computedTotalPrice = mappedItems.reduce(
      (sum, cartItem) =>
        sum +
        Number(cartItem.quantity || 0) * Number(cartItem.priceSnapShot || 0),
      0,
    );

    if (
      Number(cart.totalItems || 0) !== computedTotalItems ||
      Number(cart.totalPrice || 0) !== computedTotalPrice
    ) {
      sideEffects.push(
        Cart.updateOne(
          { _id: cart._id },
          {
            $set: {
              totalItems: computedTotalItems,
              totalPrice: computedTotalPrice,
            },
          },
        ),
      );
    }

    if (sideEffects.length > 0) {
      const sideEffectResults = await Promise.allSettled(sideEffects);
      for (const result of sideEffectResults) {
        if (result.status === "rejected") {
          console.error("Cart side-effect failed:", result.reason);
        }
      }
    }

    return res.status(200).json({
      message: "Get Cart",
      cart: {
        ...cart,
        totalItems: computedTotalItems,
        totalPrice: computedTotalPrice,
        items: mappedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity, selectedVariants } = req.body;
    const parsedQty = parseInt(quantity, 10) || 1;
    if (parsedQty <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Not found product" });
    }
    if (!isProductPurchasable(product)) {
      return res.status(400).json({ message: "Product is currently unavailable" });
    }

    const variantCheck = findVariantOption(product, selectedVariants);
    if (!variantCheck.ok) {
      return res.status(400).json({ message: variantCheck.message });
    }

    if (variantCheck.optionQuantity < parsedQty) {
      return res
        .status(400)
        .json({ message: "Product stock is not enough to add." });
    }

    const normalizedVariants = normalizeSelectedVariants(selectedVariants);
    const variantKey = buildVariantKey(normalizedVariants);

    let cart = await Cart.findOne({
      user: userId,
      status: "active",
    });

    if (!cart) {
      cart = await Cart.create({ user: userId });
    }

    let item = await CartItem.findOne({
      cart: cart._id,
      product: product._id,
      variantKey,
    });

    if (item) {
      if (variantCheck.optionQuantity < item.quantity + parsedQty) {
        return res
          .status(400)
          .json({ message: "Product stock is not enough to add." });
      }
      item.quantity += parsedQty;
      applyLatestVariantSnapshot(
        item,
        normalizedVariants,
        variantKey,
        variantCheck,
      );
      await item.save();
    } else {
      try {
        await CartItem.create({
          cart: cart._id,
          product: product._id,
          seller: product.sellerId,
          quantity: parsedQty,
          priceSnapShot: variantCheck.optionPrice,
          selectedVariants: normalizedVariants,
          variantKey,
          variantSku: variantCheck.optionSku,
          stockAlertSent: false,
        });
      } catch (createErr) {
        // Handle race condition when the same variant is added concurrently.
        if (createErr?.code !== 11000) {
          throw createErr;
        }

        const existingItem = await CartItem.findOne({
          cart: cart._id,
          product: product._id,
          variantKey,
        });

        if (!existingItem) {
          throw createErr;
        }

        if (variantCheck.optionQuantity < existingItem.quantity + parsedQty) {
          return res
            .status(400)
            .json({ message: "Product stock is not enough to add." });
        }

        existingItem.quantity += parsedQty;
        existingItem.stockAlertSent = false;
        applyLatestVariantSnapshot(
          existingItem,
          normalizedVariants,
          variantKey,
          variantCheck,
        );
        await existingItem.save();
      }
    }

    const currentItems = await CartItem.find({ cart: cart._id });

    cart.totalItems = currentItems.reduce((sum, i) => sum + i.quantity, 0);
    cart.totalPrice = currentItems.reduce(
      (sum, i) => sum + i.quantity * i.priceSnapShot,
      0,
    );

    await cart.save();

    return res.status(201).json({ message: "Added to Cart" });
  } catch (error) {
    next(error);
  }
};

exports.updateCartItemQuantity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { action, quantity } = req.body;

    const cart = await Cart.findOne({
      user: userId,
      status: "active",
    });

    if (!cart) {
      return res.status(404).json({ message: "Not found Cart" });
    }

    const item = await CartItem.findOne({
      _id: itemId,
      cart: cart._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (!isProductPurchasable(product)) {
      return res.status(400).json({
        message: "Product is currently unavailable",
      });
    }
    const normalizedVariants = normalizeSelectedVariants(
      item.selectedVariants || [],
    );
    const variantKey = buildVariantKey(normalizedVariants);
    const variantCheck = findVariantOption(product, normalizedVariants);
    if (!variantCheck.ok) {
      return res.status(400).json({
        message: variantCheck.message,
      });
    }

    let newQuantity = item.quantity;

    if (quantity !== undefined) {
      const parsedQty = parseInt(quantity, 10);

      if (isNaN(parsedQty) || parsedQty < 0) {
        return res.status(400).json({
          message: "Invalid quantity",
        });
      }

      newQuantity = parsedQty;
    }

    if (action === "increase") {
      newQuantity += 1;
    }

    if (action === "decrease") {
      newQuantity -= 1;
    }

    if (newQuantity <= 0) {
      await item.deleteOne();
      await recalculateCart(cart._id);

      return res.json({ message: "Item removed" });
    }

    if (variantCheck.optionQuantity < newQuantity) {
      return res.status(400).json({
        message: "Not enough stock",
      });
    }

    item.quantity = newQuantity;
    item.stockAlertSent = false;
    applyLatestVariantSnapshot(
      item,
      normalizedVariants,
      variantKey,
      variantCheck,
    );
    await item.save();

    await recalculateCart(cart._id);

    return res
      .status(200)
      .json({ message: "Cart updated", quantity: newQuantity });
  } catch (error) {
    next(error);
  }
};

exports.deleteCartItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId, status: "active" });

    if (!cart) {
      return res.status(404).json({ message: "Not found cart" });
    }

    const deleteItemId = await CartItem.findOneAndDelete({
      _id: itemId,
      cart: cart._id,
    });

    if (!deleteItemId) {
      return res.status(404).json({ message: "Not found item in cart" });
    }

    await recalculateCart(cart._id);

    return res.status(200).json({ message: "Delete Item" });
  } catch (error) {
    next(error);
  }
};
