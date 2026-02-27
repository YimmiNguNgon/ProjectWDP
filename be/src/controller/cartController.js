const Cart = require("../models/Cart.js");
const CartItem = require("../models/CartItem.js");
const Product = require("../models/Product.js");
const recalculateCart = require("../utils/cart.js");

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

    return res
      .status(200)
      .json({ message: "Get Cart", cart: { ...cart, items } });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Not found product" });
    }

    if (product.quantity < quantity) {
      return res
        .status(400)
        .json({ message: "Product stock is not enough to add." });
    }

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
    });

    if (item) {
      if (product.quantity < item.quantity + quantity) {
        return res
          .status(400)
          .json({ message: "Product stock is not enough to add." });
      }
      item.quantity += quantity;
      await item.save();
    } else {
      if (product.quantity < quantity) {
        return res
          .status(400)
          .json({ message: "Product stock is not enough to add." });
      }
      await CartItem.create({
        cart: cart._id,
        product: product._id,
        seller: product.sellerId,
        quantity,
        priceSnapShot: product.price,
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

    if (product.quantity < newQuantity) {
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
