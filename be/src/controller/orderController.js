const Order = require("../models/Order");
const OrderGroup = require("../models/OrderGroup");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Product = require("../models/Product");
const User = require("../models/User");
const Voucher = require("../models/Voucher");
const recalculateCart = require("../utils/cart");
const {
  validateVoucherForUser,
  markVoucherAsUsed,
} = require("./voucherController");
const {
  findVariantOption,
  normalizeSelectedVariants,
  buildVariantKey,
  syncProductStockFromVariants,
} = require("../utils/productInventory");
const sendEmail = require("../utils/sendEmail");
const notificationService = require("../services/notificationService");

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

const toUnavailableMessage = (title) =>
  `Product ${title} is currently unavailable`;

const isProductListingUnavailable = (product) => {
  if (!product) return true;

  const listingStatus = String(product.listingStatus || "").toLowerCase();
  const productStatus = String(product.status || "").toLowerCase();
  const hasDeletedAt = Boolean(product.deletedAt);

  if (hasDeletedAt || listingStatus === "deleted") return true;
  if (listingStatus && listingStatus !== "active") return true;
  if (productStatus && productStatus !== "available") return true;

  return false;
};

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

const normalizeCode = (code = "") =>
  String(code || "")
    .trim()
    .toUpperCase();

const parseSellerVoucherCodes = (sellerVoucherCodes) => {
  const normalized = {};
  if (Array.isArray(sellerVoucherCodes)) {
    for (const item of sellerVoucherCodes) {
      const sellerId = item?.sellerId ? String(item.sellerId) : "";
      const code = normalizeCode(item?.code);
      if (sellerId && code) normalized[sellerId] = code;
    }
    return normalized;
  }
  if (sellerVoucherCodes && typeof sellerVoucherCodes === "object") {
    for (const [sellerId, code] of Object.entries(sellerVoucherCodes)) {
      const normalizedCode = normalizeCode(code);
      if (sellerId && normalizedCode)
        normalized[String(sellerId)] = normalizedCode;
    }
  }
  return normalized;
};

const loadSellerNameMap = async (payableItems) => {
  const sellerIds = [
    ...new Set(payableItems.map((item) => String(item.sellerId))),
  ];
  if (sellerIds.length === 0) return {};

  const sellers = await User.find({ _id: { $in: sellerIds } })
    .select("username sellerInfo.shopName")
    .lean();

  const sellerMap = {};
  for (const seller of sellers) {
    sellerMap[String(seller._id)] =
      seller?.sellerInfo?.shopName || seller?.username || "Seller";
  }
  return sellerMap;
};

const buildCheckoutGroups = (
  payableItems,
  sellerNameMap = {},
  sellerNotes = {},
) => {
  const grouped = new Map();

  for (const item of payableItems) {
    const sellerKey = String(item.sellerId);
    if (!grouped.has(sellerKey)) {
      grouped.set(sellerKey, {
        sellerId: sellerKey,
        sellerName: sellerNameMap[sellerKey] || "Seller",
        items: [],
        subtotalAmount: 0,
        note: String(sellerNotes[sellerKey] || ""),
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
    group.subtotalAmount = Number(
      (group.subtotalAmount + lineTotal).toFixed(2),
    );
  }

  const groups = [...grouped.values()];
  const totals = groups.reduce(
    (acc, group) => {
      const itemCount = group.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const subtotalAmount = Number(
        (acc.subtotalAmount + group.subtotalAmount).toFixed(2),
      );
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

const resolveVoucherAssignments = async ({
  buyerId,
  groups,
  globalVoucherCode,
  sellerVoucherCodes,
}) => {
  const errors = [];
  const sellerCodeMap = parseSellerVoucherCodes(sellerVoucherCodes);
  const subtotalAmount = Number(
    groups
      .reduce((sum, group) => sum + Number(group.subtotalAmount || 0), 0)
      .toFixed(2),
  );

  let globalVoucherDoc = null;
  let appliedGlobalVoucher = null;
  let globalDiscountAllocation = {};
  if (globalVoucherCode) {
    const code = normalizeCode(globalVoucherCode);
    const voucher = await Voucher.findOne({ code });
    if (!voucher) {
      errors.push({
        scope: "global",
        code,
        message: "Voucher not found",
      });
    } else {
      const validation = validateVoucherForUser(
        voucher,
        buyerId,
        subtotalAmount,
        {
          scope: "global",
        },
      );
      if (!validation.ok) {
        errors.push({ scope: "global", code, message: validation.message });
      } else {
        globalVoucherDoc = voucher;
        appliedGlobalVoucher = {
          voucherId: voucher._id,
          code: voucher.code,
          scope: voucher.scope || "seller",
          type: voucher.type,
          value: voucher.value,
          discountAmount: validation.discountAmount,
          usageLimit: voucher.usageLimit ?? null,
          usedCount: voucher.usedCount || 0,
          remainingUsage:
            voucher.usageLimit === null || voucher.usageLimit === undefined
              ? null
              : Math.max(0, voucher.usageLimit - (voucher.usedCount || 0)),
        };
        globalDiscountAllocation = allocateGlobalDiscountBySeller(
          groups,
          Number(appliedGlobalVoucher.discountAmount || 0),
        );
      }
    }
  }

  const sellerVoucherDocs = {};
  const sellerVoucherBySellerId = {};
  for (const group of groups) {
    const sellerId = String(group.sellerId);
    const code = sellerCodeMap[sellerId];
    if (!code) continue;

    const baseAmountAfterGlobal = Number(
      Math.max(
        0,
        Number(group.subtotalAmount || 0) -
        Number(globalDiscountAllocation[sellerId] || 0),
      ).toFixed(2),
    );

    const voucher = await Voucher.findOne({ code });
    if (!voucher) {
      errors.push({
        scope: "seller",
        sellerId,
        sellerName: group.sellerName || "Seller",
        code,
        message: "Voucher not found",
      });
      continue;
    }

    const validation = validateVoucherForUser(
      voucher,
      buyerId,
      baseAmountAfterGlobal,
      { scope: "seller", sellerId },
    );
    if (!validation.ok) {
      errors.push({
        scope: "seller",
        sellerId,
        sellerName: group.sellerName || "Seller",
        code,
        message: validation.message,
      });
      continue;
    }

    sellerVoucherDocs[sellerId] = voucher;
    sellerVoucherBySellerId[sellerId] = {
      voucherId: voucher._id,
      sellerId,
      sellerName: group.sellerName || "Seller",
      code: voucher.code,
      scope: voucher.scope || "seller",
      type: voucher.type,
      value: voucher.value,
      baseAmount: baseAmountAfterGlobal,
      discountAmount: validation.discountAmount,
      usageLimit: voucher.usageLimit ?? null,
      usedCount: voucher.usedCount || 0,
      remainingUsage:
        voucher.usageLimit === null || voucher.usageLimit === undefined
          ? null
          : Math.max(0, voucher.usageLimit - (voucher.usedCount || 0)),
    };
  }

  const sellerVoucherDiscountAmount = Number(
    Object.values(sellerVoucherBySellerId)
      .reduce((sum, voucher) => sum + Number(voucher.discountAmount || 0), 0)
      .toFixed(2),
  );
  const globalDiscountAmount = Number(
    appliedGlobalVoucher?.discountAmount || 0,
  );
  const totalDiscount = Number(
    (sellerVoucherDiscountAmount + globalDiscountAmount).toFixed(2),
  );
  const totalAmount = Number(
    Math.max(0, subtotalAmount - totalDiscount).toFixed(2),
  );

  return {
    errors,
    appliedGlobalVoucher,
    globalDiscountAllocation,
    sellerVoucherBySellerId,
    sellerVouchers: Object.values(sellerVoucherBySellerId),
    globalVoucherDoc,
    sellerVoucherDocs,
    totals: {
      subtotalAmount,
      globalDiscountAmount,
      sellerDiscountAmount: sellerVoucherDiscountAmount,
      discountAmount: totalDiscount,
      totalAmount,
    },
  };
};

const allocateGlobalDiscountBySeller = (groups, globalDiscountAmount) => {
  const totalSubtotal = Number(
    groups
      .reduce((sum, group) => sum + Number(group.subtotalAmount || 0), 0)
      .toFixed(2),
  );
  if (globalDiscountAmount <= 0 || totalSubtotal <= 0 || groups.length === 0) {
    return {};
  }

  let allocatedSum = 0;
  const allocation = {};
  groups.forEach((group, index) => {
    const sellerId = String(group.sellerId);
    let amount = Number(
      (
        (Number(group.subtotalAmount || 0) / totalSubtotal) *
        globalDiscountAmount
      ).toFixed(2),
    );
    if (index === groups.length - 1) {
      amount = Number((globalDiscountAmount - allocatedSum).toFixed(2));
    }
    allocatedSum = Number((allocatedSum + amount).toFixed(2));
    allocation[sellerId] = amount;
  });

  return allocation;
};

const collectCheckoutItems = async ({
  buyerId,
  source,
  cartItemIds = [],
  items = [],
  itemNotes = {},
}) => {
  const normalizedSource = normalizeCheckoutSource(source);
  let unavailableItems = [];
  let payableItems = [];
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
              title: "Product in Cart",
              message: "Product in cart does not exist or has been deleted",
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
            title: "Product in Cart",
            message: "Product does not exist",
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      const title = String(product.title || "Product");
      if (isProductListingUnavailable(product)) {
        unavailableItems.push(
          toUnavailableItem({
            title,
            message: toUnavailableMessage(title),
            availableStock: 0,
            productId: product._id,
            cartItemId: cartItem._id,
            selectedVariants,
          }),
        );
        continue;
      }

      if (String(product.sellerId) === String(buyerId)) {
        unavailableItems.push(
          toUnavailableItem({
            title,
            message: "You cannot buy your own product",
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
        note:
          itemNotes[String(cartItem._id)] ||
          itemNotes[String(product._id)] ||
          "",
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
          title: "Product",
          message: "Invalid buy now data",
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
          title: "Product",
          message: "Product does not exist",
          productId: rawProductId,
          selectedVariants,
        }),
      );
      continue;
    }

    const title = String(product.title || "Product");
    if (isProductListingUnavailable(product)) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: toUnavailableMessage(title),
          availableStock: 0,
          productId: product._id,
          selectedVariants,
        }),
      );
      continue;
    }

    if (String(product.sellerId) === String(buyerId)) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: "You cannot buy your own product",
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
    const selectedVariants = normalizeSelectedVariants(
      item.selectedVariants || [],
    );

    if (!product) {
      unavailableItems.push(
        toUnavailableItem({
          title: item.title,
          message: "Product does not exist",
          productId: item.productId,
          cartItemId: item.cartItemId,
          selectedVariants,
        }),
      );
      continue;
    }

    const title = String(product.title || item.title || "Product");
    if (isProductListingUnavailable(product)) {
      unavailableItems.push(
        toUnavailableItem({
          title,
          message: toUnavailableMessage(title),
          availableStock: 0,
          productId: product._id,
          cartItemId: item.cartItemId,
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

      combo.quantity = Math.max(
        0,
        (Number(combo.quantity) || 0) - item.quantity,
      );
      syncProductStockFromVariants(product);
    } else {
      product.quantity = Math.max(
        0,
        (Number(product.quantity) || 0) - item.quantity,
      );
      product.stock = Math.max(0, (Number(product.stock) || 0) - item.quantity);
    }

    await product.save();
  }
};

const createOrdersFromPayableItems = async ({
  buyerId,
  payableItems,
  status,
  voucherContext = {},
  shippingAddress,
  shippingPrice,
  paymentMethod,
  paymentStatus,
  note,
  sellerNotes = {},
}) => {
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
  const groupsForAllocation = [...groupedBySeller.entries()].map(
    ([sellerId, sellerItems]) => ({
      sellerId,
      subtotalAmount: Number(
        sellerItems
          .reduce(
            (sum, item) =>
              sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
            0,
          )
          .toFixed(2),
      ),
    }),
  );
  const globalDiscountAllocation =
    voucherContext.globalDiscountAllocation ||
    allocateGlobalDiscountBySeller(
      groupsForAllocation,
      Number(voucherContext.appliedGlobalVoucher?.discountAmount || 0),
    );

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
        .reduce(
          (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
          0,
        )
        .toFixed(2),
    );

    const statusHistory = [{ status: "created", timestamp: now }];
    if (status !== "created") {
      statusHistory.push({ status, timestamp: now });
    }

    const sellerVoucher =
      voucherContext.sellerVoucherBySellerId?.[sellerId] || null;
    const sellerDiscount = Number(sellerVoucher?.discountAmount || 0);
    const globalAllocated = Number(globalDiscountAllocation[sellerId] || 0);
    const totalDiscount = Number(
      Math.min(subtotalAmount, sellerDiscount + globalAllocated).toFixed(2),
    );
    const totalAmount = Number(
      Math.max(0, subtotalAmount - totalDiscount).toFixed(2),
    );

    const voucherGlobal =
      voucherContext.appliedGlobalVoucher && globalAllocated > 0
        ? {
          voucherId: voucherContext.appliedGlobalVoucher.voucherId,
          code: voucherContext.appliedGlobalVoucher.code,
          type: voucherContext.appliedGlobalVoucher.type,
          value: voucherContext.appliedGlobalVoucher.value,
          discountAmount: globalAllocated,
        }
        : undefined;

    const voucherSeller = sellerVoucher
      ? {
        voucherId: sellerVoucher.voucherId,
        code: sellerVoucher.code,
        type: sellerVoucher.type,
        value: sellerVoucher.value,
        discountAmount: sellerDiscount,
      }
      : undefined;

    const legacyVoucher = sellerVoucher
      ? {
        voucherId: sellerVoucher.voucherId,
        code: sellerVoucher.code,
        type: sellerVoucher.type,
        value: sellerVoucher.value,
        discountAmount: sellerDiscount,
      }
      : voucherGlobal
        ? {
          voucherId: voucherGlobal.voucherId,
          code: voucherGlobal.code,
          type: voucherGlobal.type,
          value: voucherGlobal.value,
          discountAmount: voucherGlobal.discountAmount,
        }
        : undefined;

    const orderNote = sellerNotes[sellerId] || note || "";
    const order = await Order.create({
      buyer: buyerId,
      seller: sellerId,
      items: orderItems,
      subtotalAmount,
      discountAmount: totalDiscount,
      voucher: legacyVoucher,
      voucherGlobal,
      voucherSeller,
      discountBreakdown: {
        globalAllocated,
        sellerDiscount,
        totalDiscount,
      },
      totalAmount,
      status,
      paymentStatus,
      statusHistory,
      shippingAddress,
      shippingPrice: 0, // Shipping is now at OrderGroup level
      paymentMethod,
      note: orderNote,
    });

    orders.push(order);
  }

  return orders;
};

// Lấy tất cả orders với format mới
getAllOrders = async (req, res) => {
  try {
    const filter = {};

    // Only return user's own orders unless they are an admin
    if (req.user.role === "buyer") {
      filter.buyer = req.user._id;
    } else if (req.user.role === "seller") {
      filter.seller = req.user._id;
    } else if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized role" });
    }

    const orders = await Order.find(filter)
      .populate("buyer", "username email") // Giả sử User model có trường username và email
      .populate("seller", "username")
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
        //_id: `#ORD${String(order._id).slice(-6).toUpperCase()}`,
        customer: order.buyer?.username || "Customer",
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
        paymentStatus: order.paymentStatus || "unpaid",
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
      message: "Error fetching order list",
      error: error.message,
    });
  }
};

getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedRole = String(req.query.role || "").toLowerCase();
    const roleScope =
      requestedRole === "buyer" || requestedRole === "seller"
        ? requestedRole
        : req.user.role;

    let group = await OrderGroup.findById(id).lean();
    let orders = [];

    let single = null;
    if (!group) {
      single = await Order.findById(id);
    }

    const groupOrderId = group ? id : single?.orderGroup || null;

    if (groupOrderId) {
      if (!group) {
        group = await OrderGroup.findById(groupOrderId).lean();
      }

      const groupFilter = { orderGroup: groupOrderId };

      // Security: Scope order-group details by requested context (buyer/seller).
      // Falls back to authenticated role when role query is absent.
      if (roleScope === "buyer") {
        groupFilter.buyer = req.user._id;
      } else if (roleScope === "seller") {
        groupFilter.seller = req.user._id;
      }

      orders = await Order.find(groupFilter)
        .populate("buyer", "username email phone address")
        .populate("seller", "username email phone")
        .populate("shipper", "username email")
        .populate("items.productId", "title images image");
    } else if (single) {
      orders = [single];
    }

    if (orders.length > 0) {
      // Security check: ensure user owns the order or is admin
      const firstOrder = orders[0];
      const isOwner =
        String(firstOrder.buyer?._id || firstOrder.buyer) ===
        String(req.user._id) ||
        String(firstOrder.seller?._id || firstOrder.seller) ===
        String(req.user._id);

      if (!isOwner && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view this order",
        });
      }
    }

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const formattedOrders = orders.map((order) => {
      const totalItems = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const paymentMethod = order.paymentMethod || "Credit Card";

      return {
        _id: order._id,
        orderId: `#ORD${String(order._id).slice(-6).toUpperCase()}`,
        customer: order.buyer,
        email: order.buyer?.email || "",
        phone: order.buyer?.phone || "",
        shippingAddress: order.shippingAddress || null,
        seller: order.seller,
        shipper: order.shipper || null,
        totalAmount: order.totalAmount, // WITHOUT group shipping
        shippingPrice: order.shippingPrice || 0,
        subtotalAmount: order.subtotalAmount ?? order.totalAmount,
        discountAmount: order.discountAmount ?? 0,
        voucher: order.voucher || null,
        status: order.status,
        paymentStatus: order.paymentStatus || "unpaid",
        items: order.items,
        itemCount: totalItems,
        note: order.note || "", // include seller/buyer note here
        statusHistory: order.statusHistory || [],
        date: formatDate(order.createdAt),
        paymentMethod: paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    const shippingPrice = group
      ? group.shippingPrice || 0
      : orders[0].shippingPrice || 0;
    const totalAmount = group
      ? group.totalAmount
      : orders[0].totalAmount + shippingPrice;

    res.status(200).json({
      success: true,
      data: formattedOrders,
      isGroup: !!group,
      groupId: group ? group._id : orders[0]?.orderGroup || null,
      shippingPrice: shippingPrice,
      groupTotal: totalAmount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order details",
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
      search,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter query
    let filter = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ "items.title": searchRegex }, { orderId: searchRegex }];
    }

    // Lọc theo role của user hiện tại
    if (role === "buyer") {
      filter.buyer = req.user._id;
    } else if (role === "seller") {
      filter.seller = req.user._id;
    } else if (req.user.role === "buyer") {
      filter.buyer = req.user._id;
    } else if (req.user.role === "seller") {
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
        .populate("shipper", "username email")
        .populate("orderGroup", "shippingPrice totalAmount")
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
        orderGroup: order.orderGroup || null,
        buyer: order.buyer,
        seller: order.seller,
        shipper: order.shipper || null,
        customer: order.buyer?.username || "Customer",
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
        paymentStatus: order.paymentStatus || "unpaid",
        items: order.items,
        itemCount: totalItems,
        date: formatDate(order.createdAt),
        paymentMethod: paymentMethod,
        createdAt: order.createdAt,
        shippingAddress: order.shippingAddress,
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
      message: "Error fetching order list",
      error: error.message,
    });
  }
};

// Thống kê orders
getOrderStats = async (req, res) => {
  try {
    const match = {};
    if (req.user.role === "seller") {
      match.seller = req.user._id;
    } else if (req.user.role === "buyer") {
      match.buyer = req.user._id;
    }

    const stats = await Order.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
              },
            },
          ],
          countsByStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];
    const totals = result.totals[0] || { totalOrders: 0, totalRevenue: 0 };
    const counts = {};

    // Initialize all possible statuses to 0
    const allStatuses = [
      "created",
      "packaging",
      "ready_to_ship",
      "shipping",
      "delivered",
      "cancelled",
      "failed",
      "completed",
    ];
    allStatuses.forEach((s) => (counts[s] = 0));

    // Map aggregation results to counts object
    result.countsByStatus.forEach((item) => {
      counts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders: totals.totalOrders,
        totalRevenue: totals.totalRevenue,
        counts: counts,
        // Legacy support if needed
        pendingOrders:
          (counts.created || 0) +
          (counts.packaging || 0) +
          (counts.ready_to_ship || 0),
        completedOrders: (counts.delivered || 0) + (counts.completed || 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order stats",
      error: error.message,
    });
  }
};

// Tạo đơn hàng mới
previewCheckout = async (req, res) => {
  try {
    const buyerId = req.user._id;
    const {
      source,
      cartItemIds,
      items,
      sellerNotes = {},
      globalVoucherCode = "",
      sellerVoucherCodes = [],
    } = req.body || {};

    const checkout = await collectCheckoutItems({
      buyerId,
      source,
      cartItemIds,
      items,
    });
    const sellerNameMap = await loadSellerNameMap(checkout.payableItems);
    const summary = buildCheckoutGroups(
      checkout.payableItems,
      sellerNameMap,
      sellerNotes,
    );
    const voucherResolution = await resolveVoucherAssignments({
      buyerId,
      groups: summary.groups,
      globalVoucherCode,
      sellerVoucherCodes,
    });

    const totals = {
      itemCount: summary.totals.itemCount,
      subtotalAmount: summary.totals.subtotalAmount,
      globalDiscountAmount: voucherResolution.totals.globalDiscountAmount,
      sellerDiscountAmount: voucherResolution.totals.sellerDiscountAmount,
      discountAmount: voucherResolution.totals.discountAmount,
      totalAmount: voucherResolution.totals.totalAmount,
    };

    return res.status(200).json({
      success: true,
      source: checkout.source,
      groups: summary.groups,
      totals,
      appliedVouchers: {
        global: voucherResolution.appliedGlobalVoucher,
        seller: voucherResolution.sellerVouchers,
      },
      voucherErrors: voucherResolution.errors,
      payableItemCount: summary.payableItemCount,
      outOfStockItems: checkout.unavailableItems,
      canProceed: summary.payableItemCount > 0,
      sellerNotes,
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
      sellerNotes = {},
      globalVoucherCode = "",
      sellerVoucherCodes = [],
      paymentSimulation = "success",
      shippingAddress,
      shippingPrice,
      paymentMethod,
      note,
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

    const sellerNameMap = await loadSellerNameMap(checkout.payableItems);
    const summary = buildCheckoutGroups(
      checkout.payableItems,
      sellerNameMap,
      sellerNotes,
    );
    const voucherResolution = await resolveVoucherAssignments({
      buyerId,
      groups: summary.groups,
      globalVoucherCode,
      sellerVoucherCodes,
    });

    const hasRequestedVouchers =
      Boolean(String(globalVoucherCode || "").trim()) ||
      Object.keys(parseSellerVoucherCodes(sellerVoucherCodes)).length > 0;
    if (hasRequestedVouchers && voucherResolution.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: voucherResolution.errors[0]?.message || "Voucher is invalid",
        voucherErrors: voucherResolution.errors,
      });
    }

    if (paymentSimulation === "success") {
      const stockCheck = await preValidatePayableItemsStock(
        checkout.payableItems,
      );
      if (!stockCheck.ok) {
        return res.status(409).json({
          success: false,
          message: "Some items are no longer in stock",
          outOfStockItems: stockCheck.unavailableItems,
        });
      }
      await deductStockForPayableItems(checkout.payableItems);
    }

    const finalStatus = paymentSimulation === "success" ? "created" : "failed";

    let paymentStatus = "unpaid";
    if (paymentSimulation === "success") {
      paymentStatus =
        String(paymentMethod || "").toLowerCase() === "cod" ? "unpaid" : "paid";
    } else {
      paymentStatus = "failed";
    }

    const orders = await createOrdersFromPayableItems({
      buyerId,
      payableItems: checkout.payableItems,
      status: finalStatus,
      paymentStatus,
      voucherContext: voucherResolution,
      shippingAddress,
      shippingPrice,
      paymentMethod,
      note,
      sellerNotes,
    });

    let orderGroup = null;
    if (orders.length > 0) {
      const parentTotal = orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0,
      );
      orderGroup = await OrderGroup.create({
        buyer: buyerId,
        orders: orders.map((o) => o._id),
        totalAmount: parentTotal + Number(shippingPrice || 0), // Include shipping in group total
        status: finalStatus,
        paymentStatus,
        shippingAddress,
        shippingPrice: Number(shippingPrice || 0),
        paymentMethod,
        note,
      });

      // Link sub-orders to the group
      await Order.updateMany(
        { _id: { $in: orders.map((o) => o._id) } },
        { $set: { orderGroup: orderGroup._id } },
      );
    }

    // Notify each seller about new orders (fire-and-forget)
    if (paymentSimulation === "success" && orders.length > 0) {
      for (const order of orders) {
        const productNames = (order.items || [])
          .map((item) => item.title || "Product")
          .filter(Boolean);
        const productLabel =
          productNames.length === 1
            ? productNames[0]
            : productNames.length > 1
              ? `${productNames[0]} and ${productNames.length - 1} more`
              : "an item";
        notificationService
          .sendNotification({
            recipientId: order.seller,
            type: "new_order",
            title: `New order: "${productLabel}"`,
            body: `A buyer just ordered "${productLabel}". Please start packaging.`,
            link: `/seller/orders`,
            metadata: { orderId: order._id },
          })
          .catch(() => { });
      }
    }

    if (paymentSimulation === "success") {
      const orderBySellerId = {};
      orders.forEach((order) => {
        orderBySellerId[String(order.seller)] = order;
      });

      if (voucherResolution.globalVoucherDoc) {
        await markVoucherAsUsed(
          voucherResolution.globalVoucherDoc,
          buyerId,
          orders[0]?._id || null,
        );
      }

      const sellerVoucherDocEntries = Object.entries(
        voucherResolution.sellerVoucherDocs || {},
      );
      for (const [sellerId, voucherDoc] of sellerVoucherDocEntries) {
        const order = orderBySellerId[String(sellerId)];
        await markVoucherAsUsed(voucherDoc, buyerId, order?._id || null);
      }
    }

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

    if (paymentSimulation === "success" && orders.length > 0) {
      try {
        const user = await User.findById(buyerId).lean();
        if (user && user.email) {
          await sendEmail({
            to: user.email,
            subject: "Order Place Successfully - EFPT",
            template: "orderSuccess.ejs",
            data: {
              username: user.username,
              orderGroupId: orderGroup ? orderGroup._id : orders[0]._id,
              date: formatDate(new Date()),
              totalAmount: orderGroup
                ? orderGroup.totalAmount
                : orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) +
                Number(shippingPrice || 0),
              paymentMethod: paymentMethod || "COD",
              shippingAddress: shippingAddress,
              orderUrl: `${process.env.CLIENT_URL}/my-ebay/activity/purchases`,
            },
          });
          console.log(`✅ Order confirmation email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error(
          "❌ Failed to send order confirmation email:",
          emailError.message,
        );
      }
    }

    return res.status(201).json({
      success: true,
      paymentStatus: paymentStatus,
      orders,
      appliedVouchers: {
        global: voucherResolution.appliedGlobalVoucher,
        seller: voucherResolution.sellerVouchers,
      },
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
    const { items, globalVoucherCode, sellerVoucherCodes } = req.body || {};
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
      globalVoucherCode,
      sellerVoucherCodes,
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
