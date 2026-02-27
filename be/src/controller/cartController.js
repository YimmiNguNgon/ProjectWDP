const Cart = require("../models/Cart.js");
const CartItem = require("../models/CartItem.js");
const Product = require("../models/Product.js");
const recalculateCart = require("../utils/cart.js");
const {
  buildVariantKey,
  findVariantOption,
  normalizeSelectedVariants,
} = require("../utils/productInventory");

exports.getMyCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId, status: "active" }).lean();

    if (!cart) {
      cart = await Cart.create({ user: userId });
    }

    const items = await CartItem.find({ cart: cart._id })
      .populate("product")
      .populate("seller", "name")
      .lean();

    const mappedItems = items.map((item) => {
      const variantCheck = findVariantOption(item.product, item.selectedVariants || []);
      const availableStock = variantCheck.ok
        ? variantCheck.optionQuantity
        : Number(item.product.quantity || item.product.stock || 0);

      return {
        ...item,
        availableStock,
      };
    });

    return res
      .status(200)
      .json({ message: "Get Cart", cart: { ...cart, items: mappedItems } });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity, selectedVariants } = req.body;
    const parsedQty = parseInt(quantity) || 1;
    if (parsedQty <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Not found product" });
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
      await item.save();
    } else {
      await CartItem.create({
        cart: cart._id,
        product: product._id,
        seller: product.sellerId,
        quantity: parsedQty,
        priceSnapShot: variantCheck.optionPrice,
        selectedVariants: normalizedVariants,
        variantKey,
        variantSku: variantCheck.optionSku,
      });
    }

    const items = await CartItem.find({ cart: cart._id });

    cart.totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    cart.totalPrice = items.reduce(
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
    const variantCheck = findVariantOption(product, item.selectedVariants || []);
    if (!variantCheck.ok) {
      return res.status(400).json({
        message: variantCheck.message,
      });
    }

    let newQuantity = item.quantity;

    if (quantity !== undefined) {
      const parsedQty = parseInt(quantity);

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
