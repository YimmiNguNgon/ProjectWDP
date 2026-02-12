const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");

const recalculateCart = async (cartId) => {
  const items = await CartItem.find({ cart: cartId });

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.quantity * i.priceSnapShot,
    0,
  );

  await Cart.findByIdAndUpdate(cartId, {
    totalItems,
    totalPrice,
  });
};

module.exports = recalculateCart;
