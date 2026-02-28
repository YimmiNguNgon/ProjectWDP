const Order = require("../models/Order");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Product = require("../models/Product");
const recalculateCart = require("../utils/cart");
const {
  findVariantOption,
  normalizeSelectedVariants,
  buildVariantKey,
  syncProductStockFromVariants,
} = require("../utils/productInventory");

// Helper function để format date
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const CHECKOUT_SOURCE = {
  CART: "cart",
  BUY_NOW: "buy_now",
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCheckoutSource = (source) => {
  if (source === CHECKOUT_SOURCE.BUY_NOW) return CHECKOUT_SOURCE.BUY_NOW;
  return CHECKOUT_SOURCE.CART;
};

const toVnOutOfStockMessage = (title) => `Sản phẩm ${title} đã hết hàng`;

const toVnLimitedStockMessage = (title, availableStock) =>
  `Sản phẩm ${title} chỉ còn ${availableStock} sản phẩm`;

const toUnavailableItem = ({
  title,
  message,
  availableStock = 0,
  productId = "",
  cartItemId = "",
  selectedVariants = [],
}) => ({
  title,
  message,
  availableStock: Number(availableStock || 0),
  productId: productId ? String(productId) : "",
  cartItemId: cartItemId ? String(cartItemId) : "",
  selectedVariants: normalizeSelectedVariants(selectedVariants || []),
});

const buildCheckoutGroups = (payableItems) => {
  const grouped = new Map();

  for (const item of payableItems) {
    const sellerKey = String(item.sellerId);
    if (!grouped.has(sellerKey)) {
      grouped.set(sellerKey, {
        sellerId: sellerKey,
        items: [],
        subtotalAmount: 0,
      });
    }

    const lineTotal = Number((item.unitPrice * item.quantity).toFixed(2));
    const group = grouped.get(sellerKey);
    group.items.push({
      cartItemId: item.cartItemId ? String(item.cartItemId) : "",
      productId: String(item.productId),
      title: item.title,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      selectedVariants: normalizeSelectedVariants(item.selectedVariants || []),
      variantSku: item.variantSku || "",
      availableStock: Number(item.availableStock || 0),
      lineTotal,
    });
    group.subtotalAmount = Number((group.subtotalAmount + lineTotal).toFixed(2));
  }

  const groups = [...grouped.values()];
  const totals = groups.reduce(
    (acc, group) => {
      const itemCount = group.items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotalAmount = Number((acc.subtotalAmount + group.subtotalAmount).toFixed(2));
      return {
        itemCount: acc.itemCount + itemCount,
        subtotalAmount,
        totalAmount: subtotalAmount,
      };
    },
    { itemCount: 0, subtotalAmount: 0, totalAmount: 0 },
  );

  return {
    groups,
    totals,
    payableItemCount: payableItems.length,
  };
};

const collectCheckoutItems = async ({
  buyerId,
  source,
  cartItemIds = [],
  items = [],
}) => {
  const normalizedSource = normalizeCheckoutSource(source);
  const unavailableItems = [];
  const payableItems = [];
  let cart = null;

  if (normalizedSource === CHECKOUT_SOURCE.CART) {
    cart = await Cart.findOne({ user: buyerId, status: "active" });
    if (!cart) {
      return { payableItems, unavailableItems, cart, source: normalizedSource };
    }

    const selectedCartItemIds = toArray(cartItemIds).filter(Boolean);
    const query = { cart: cart._id };
    if (selectedCartItemIds.length > 0) {
      query._id = { $in: selectedCartItemIds };
    }

    const cartItems = await CartItem.find(query).populate("product").lean();
    const foundCartItemIds = new Set(cartItems.map((item) => String(item._id)));

    if (selectedCartItemIds.length > 0) {
      for (const requestedId of selectedCartItemIds) {
        if (!foundCartItemIds.has(String(requestedId))) {
          unavailableItems.push(
            toUnavailableItem({
              title: "Sản phẩm trong giỏ",
              message: "Sản phẩm trong giỏ không còn tồn tại hoặc đã bị xóa",
              cartItemId: requestedId,
            }),
          );
        }
      }
    }

    for (const cartItem of cartItems) {
      const product = cartItem.product;
      const selectedVariants = normalizeSelectedVariants(
        cartItem.selectedVariants || [],
      );

      if (!product) {
        unavailableItems.push(
          toUnavailableItem({
            title: "Sản phẩm trong giỏ",
            message: "Sản phẩm này không còn tồn tại",
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      const title = String(product.title || "Sản phẩm");
      if (String(product.sellerId) === String(buyerId)) {
        unavailableItems.push(
          toUnavailableItem({
            title,
            message: "Bạn không thể mua sản phẩm của chính mình",
            availableStock: 0,
            productId: product._id,
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      const variantCheck = findVariantOption(product, selectedVariants);
      if (!variantCheck.ok) {
        unavailableItems.push(
          toUnavailableItem({
            title,
            message: variantCheck.message,
            availableStock: 0,
            productId: product._id,
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      const availableStock = Number(variantCheck.optionQuantity || 0);
      const quantity = Number(cartItem.quantity || 0);

      if (availableStock <= 0) {
        unavailableItems.push(
          toUnavailableItem({
            title,
            message: toVnOutOfStockMessage(title),
            availableStock,
            productId: product._id,
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      if (quantity > availableStock) {
        unavailableItems.push(
          toUnavailableItem({
            title,
            message: toVnLimitedStockMessage(title, availableStock),
            availableStock,
            productId: product._id,
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      payableItems.push({
        cartItemId: cartItem._id,
        productId: product._id,
        sellerId: product.sellerId,
        title,
        quantity,
        unitPrice: Number(variantCheck.optionPrice || 0),
        selectedVariants,
        variantSku: variantCheck.optionSku || "",
        variantKey: buildVariantKey(selectedVariants),
        availableStock,
      });
    }

    return { payableItems, unavailableItems, cart, source: normalizedSource };
  }

  const buyNowItems = toArray(items);
  for (const rawItem of buyNowItems) {
    const quantity = Number(parseInt(rawItem?.quantity, 10) || 0);
    const rawProductId = rawItem?.productId ? String(rawItem.productId) : "";

    if (!rawProductId || quantity <= 0) {
      unavailableItems.push(
        toUnavailableItem({
          title: "Sản phẩm",
          message: "Dữ liệu mua ngay không hợp lệ",
          productId: rawProductId,
          selectedVariants: rawItem?.selectedVariants || [],
        }),
      );
      continue;
    }

    const product = await Product.findById(rawProductId).lean();
    const selectedVariants = normalizeSelectedVariants(
      rawItem?.selectedVariants || [],
    );

    if (!product) {
      unavailableItems.push(
        toUnavailableItem({
          title: "Sản phẩm",
          message: "Sản phẩm không tồn tại",
          productId: rawProductId,
          selectedVariants,
        }),
      );
      continue;
    }

    const title = String(product.title || "Sản phẩm");
    if (String(product.sellerId) === String(buyerId)) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: "Bạn không thể mua sản phẩm của chính mình",
          availableStock: 0,
          productId: product._id,
          selectedVariants,
        }),
      );
      continue;
    }

    const variantCheck = findVariantOption(product, selectedVariants);
    if (!variantCheck.ok) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: variantCheck.message,
          availableStock: 0,
          productId: product._id,
          selectedVariants,
        }),
      );
      continue;
    }

    const availableStock = Number(variantCheck.optionQuantity || 0);
    if (availableStock <= 0) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: toVnOutOfStockMessage(title),
          availableStock,
          productId: product._id,
          selectedVariants,
        }),
      );
      continue;
    }

    if (quantity > availableStock) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: toVnLimitedStockMessage(title, availableStock),
          availableStock,
          productId: product._id,
          selectedVariants,
        }),
      );
      continue;
    }

    payableItems.push({
      cartItemId: null,
      productId: product._id,
      sellerId: product.sellerId,
      title,
      quantity,
      unitPrice: Number(variantCheck.optionPrice || 0),
      selectedVariants,
      variantSku: variantCheck.optionSku || "",
      variantKey: buildVariantKey(selectedVariants),
      availableStock,
    });
  }

  return { payableItems, unavailableItems, cart, source: normalizedSource };
};

const preValidatePayableItemsStock = async (payableItems) => {
  const unavailableItems = [];

  for (const item of payableItems) {
    const product = await Product.findById(item.productId).lean();
    const selectedVariants = normalizeSelectedVariants(item.selectedVariants || []);

    if (!product) {
      unavailableItems.push(
        toUnavailableItem({
          title: item.title,
          message: "Sản phẩm không tồn tại",
          productId: item.productId,
          cartItemId: item.cartItemId,
          selectedVariants,
        }),
      );
      continue;
    }

    const title = String(product.title || item.title || "Sản phẩm");
    const variantCheck = findVariantOption(product, selectedVariants);
    if (!variantCheck.ok) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: variantCheck.message,
          productId: product._id,
          cartItemId: item.cartItemId,
          selectedVariants,
        }),
      );
      continue;
    }

    const availableStock = Number(variantCheck.optionQuantity || 0);
    if (availableStock <= 0) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: toVnOutOfStockMessage(title),
          availableStock,
          productId: product._id,
          cartItemId: item.cartItemId,
          selectedVariants,
        }),
      );
      continue;
    }

    if (item.quantity > availableStock) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: toVnLimitedStockMessage(title, availableStock),
          availableStock,
          productId: product._id,
          cartItemId: item.cartItemId,
          selectedVariants,
        }),
      );
      continue;
    }
  }

  return {
    ok: unavailableItems.length === 0,
    unavailableItems,
  };
};

const deductStockForPayableItems = async (payableItems) => {
  for (const item of payableItems) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const normalizedVariants = normalizeSelectedVariants(item.selectedVariants);
    const hasVariantCombos =
      Array.isArray(product.variantCombinations) &&
      product.variantCombinations.length > 0 &&
      normalizedVariants.length > 0;

    if (hasVariantCombos) {
      const key = buildVariantKey(normalizedVariants);
      const combo = product.variantCombinations.find((c) => c.key === key);
      if (!combo) {
        throw new Error(
          `Variant combination is not configured for "${product.title}"`,
        );
      }

      combo.quantity = Math.max(0, (Number(combo.quantity) || 0) - item.quantity);
      syncProductStockFromVariants(product);
    } else {
      product.quantity = Math.max(0, (Number(product.quantity) || 0) - item.quantity);
      product.stock = Math.max(0, (Number(product.stock) || 0) - item.quantity);
    }

    await product.save();
  }
};

const createOrdersFromPayableItems = async ({ buyerId, payableItems, status }) => {
  const groupedBySeller = new Map();

  for (const item of payableItems) {
    const sellerKey = String(item.sellerId);
    if (!groupedBySeller.has(sellerKey)) {
      groupedBySeller.set(sellerKey, []);
    }
    groupedBySeller.get(sellerKey).push(item);
  }

  const now = new Date();
  const orders = [];

  for (const [sellerId, sellerItems] of groupedBySeller.entries()) {
    const orderItems = sellerItems.map((item) => ({
      productId: item.productId,
      title: item.title,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      selectedVariants: normalizeSelectedVariants(item.selectedVariants || []),
      variantSku: item.variantSku || "",
    }));

    const subtotalAmount = Number(
      orderItems
        .reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0)
        .toFixed(2),
    );

    const statusHistory = [{ status: "created", timestamp: now }];
    if (status !== "created") {
      statusHistory.push({ status, timestamp: now });
    }

    const order = await Order.create({
      buyer: buyerId,
      seller: sellerId,
      items: orderItems,
      subtotalAmount,
      discountAmount: 0,
      totalAmount: subtotalAmount,
      status,
      statusHistory,
    });

    orders.push(order);
  }

  return orders;
};

// Lấy tất cả orders với format mới
getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("buyer", "name email") // Giả sử User model có trường name và email
      .populate("seller", "name")
      .populate("items.productId", "title")
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => {
      // Tính tổng số items
      const totalItems = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      // Lấy payment method (cần thêm vào model nếu chưa có)
      // Tạm thời dùng mặc định hoặc từ data khác
      const paymentMethod = order.paymentMethod || "Credit Card"; // Giả sử có trường này

      return {
        _id: order._id, // Hoặc có thể tạo orderId format như #ORD001
        // Nếu muốn format _id thành #ORD001:
        // _id: `#ORD${String(order._id).slice(-6).toUpperCase()}`,
        customer: order.buyer?.name || "Khách hàng",
        email: order.buyer?.email || "",
        total: order.totalAmount,
        subtotal: order.subtotalAmount ?? order.totalAmount,
        discountAmount: order.discountAmount ?? 0,
        voucher: order.voucher
          ? {
              code: order.voucher.code || "",
              discountAmount: order.voucher.discountAmount || 0,
            }
          : null,
        status: order.status,
        items: order.items, // Return the actual items array
        itemCount: totalItems, // Số lượng items (tổng quantity)
        date: formatDate(order.createdAt),
        paymentMethod: paymentMethod,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedOrders,
      total: formattedOrders.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

// Lấy order theo ID với format mới
getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email phone address")
      .populate("seller", "name email phone")
      .populate("items.productId", "title images");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Tính tổng số items
    const totalItems = order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // Lấy payment method
    const paymentMethod = order.paymentMethod || "Credit Card";

    const formattedOrder = {
      _id: order._id,
      orderId: `#ORD${String(order._id).slice(-6).toUpperCase()}`, // Tạo orderId đẹp
      customer: order.buyer?.name || "Khách hàng",
      email: order.buyer?.email || "",
      phone: order.buyer?.phone || "",
      address: order.buyer?.address || "",
      seller: order.seller?.name || "",
      totalAmount: order.totalAmount,
      subtotalAmount: order.subtotalAmount ?? order.totalAmount,
      discountAmount: order.discountAmount ?? 0,
      voucher: order.voucher || null,
      status: order.status,
      items: totalItems,
      date: formatDate(order.createdAt),
      paymentMethod: paymentMethod,
      orderDetails: order.items.map((item) => ({
        productId: item.productId?._id,
        productName: item.productId?.title || item.title || "Sản phẩm",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin đơn hàng",
      error: error.message,
    });
  }
};

// Lấy orders với filter và pagination
getOrders = async (req, res) => {
  try {
    const {
      role,
      status,
      customer,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter query
    let filter = {};

    // Lọc theo role của user hiện tại
    if (role === "buyer" && req.user) {
      filter.buyer = req.user._id;
    } else if (role === "seller" && req.user) {
      filter.seller = req.user._id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Tính phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query với populate và filter
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyer", "username email")
        .populate("seller", "username email")
        .populate("items.productId", "title images image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    // Format orders
    const formattedOrders = orders.map((order) => {
      const totalItems = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const paymentMethod = order.paymentMethod || "Credit Card";

      return {
        _id: order._id,
        orderId: `#ORD${String(order._id).slice(-6).toUpperCase()}`,
        buyer: order.buyer,
        seller: order.seller,
        customer: order.buyer?.username || "Khách hàng",
        email: order.buyer?.email || "",
        totalAmount: order.totalAmount,
        subtotalAmount: order.subtotalAmount ?? order.totalAmount,
        discountAmount: order.discountAmount ?? 0,
        voucher: order.voucher
          ? {
              code: order.voucher.code || "",
              discountAmount: order.voucher.discountAmount || 0,
            }
          : null,
        status: order.status,
        items: order.items,
        itemCount: totalItems,
        date: formatDate(order.createdAt),
        paymentMethod: paymentMethod,
        createdAt: order.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

// Thống kê orders
getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          pendingOrders: {
            $sum: {
              $cond: [{ $in: ["$status", ["created", "paid", "processing"]] }, 1, 0],
            },
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
      error: error.message,
    });
  }
};

// Tạo đơn hàng mới
previewCheckout = async (req, res) => {
  try {
    const buyerId = req.user._id;
    const { source, cartItemIds, items } = req.body || {};

    const checkout = await collectCheckoutItems({
      buyerId,
      source,
      cartItemIds,
      items,
    });
    const summary = buildCheckoutGroups(checkout.payableItems);

    return res.status(200).json({
      success: true,
      source: checkout.source,
      groups: summary.groups,
      totals: summary.totals,
      payableItemCount: summary.payableItemCount,
      outOfStockItems: checkout.unavailableItems,
      canProceed: summary.payableItemCount > 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to preview checkout",
      error: error.message,
    });
  }
};

confirmCheckout = async (req, res) => {
  try {
    const buyerId = req.user._id;
    const {
      source,
      cartItemIds,
      items,
      paymentSimulation = "success",
    } = req.body || {};

    if (!["success", "failed"].includes(paymentSimulation)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment simulation mode",
      });
    }

    const checkout = await collectCheckoutItems({
      buyerId,
      source,
      cartItemIds,
      items,
    });

    if (checkout.payableItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No purchasable items found",
        outOfStockItems: checkout.unavailableItems,
      });
    }

    if (paymentSimulation === "success") {
      const stockCheck = await preValidatePayableItemsStock(checkout.payableItems);
      if (!stockCheck.ok) {
        return res.status(409).json({
          success: false,
          message: "Some items are no longer in stock",
          outOfStockItems: stockCheck.unavailableItems,
        });
      }
      await deductStockForPayableItems(checkout.payableItems);
    }

    const finalStatus = paymentSimulation === "success" ? "paid" : "failed";
    const orders = await createOrdersFromPayableItems({
      buyerId,
      payableItems: checkout.payableItems,
      status: finalStatus,
    });

    if (
      paymentSimulation === "success" &&
      checkout.source === CHECKOUT_SOURCE.CART &&
      checkout.cart
    ) {
      const paidCartItemIds = checkout.payableItems
        .map((item) => item.cartItemId)
        .filter(Boolean);

      if (paidCartItemIds.length > 0) {
        await CartItem.deleteMany({
          _id: { $in: paidCartItemIds },
          cart: checkout.cart._id,
        });
        await recalculateCart(checkout.cart._id);
      }
    }

    return res.status(201).json({
      success: true,
      paymentStatus: finalStatus,
      orders,
      outOfStockItems: checkout.unavailableItems,
      redirectTo: "/my-ebay/activity/purchases",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to confirm checkout",
      error: error.message,
    });
  }
};

// Legacy endpoint: direct order create is treated as successful buy-now checkout.
createOrder = async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order items",
      });
    }

    req.body = {
      source: CHECKOUT_SOURCE.BUY_NOW,
      items,
      paymentSimulation: "success",
    };

    return confirmCheckout(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrders,
  getOrderStats,
  previewCheckout,
  confirmCheckout,
  createOrder,
};


