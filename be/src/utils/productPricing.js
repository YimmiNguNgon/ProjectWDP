const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const roundMoney = (value) => Number(toSafeNumber(value).toFixed(2));

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const calculateDiscountPercent = (originalPrice, discountedPrice) => {
  const original = toSafeNumber(originalPrice);
  const discounted = toSafeNumber(discountedPrice);
  if (original <= 0 || discounted <= 0 || discounted >= original) return null;
  return Math.round(((original - discounted) / original) * 100);
};

const isTimedDealActive = (product, now = new Date()) => {
  if (!product || product.promotionType !== "daily_deal") return false;

  const startDate = toValidDate(product.dealStartDate);
  const endDate = toValidDate(product.dealEndDate);
  if (!startDate || !endDate) return false;

  const nowMs = new Date(now).getTime();
  return nowMs >= startDate.getTime() && nowMs <= endDate.getTime();
};

const resolveProductPricing = (product, now = new Date()) => {
  const currentPrice = toSafeNumber(product?.price);
  const originalPrice = toSafeNumber(product?.originalPrice, null);
  const promotionType = String(product?.promotionType || "normal");
  const timedSaleActive = isTimedDealActive(product, now);

  // Always-on outlet promotion.
  if (
    promotionType === "outlet" &&
    originalPrice !== null &&
    originalPrice > currentPrice &&
    currentPrice > 0
  ) {
    return {
      effectivePrice: currentPrice,
      originalPrice,
      discountPercent:
        toSafeNumber(product?.discountPercent, null) ||
        calculateDiscountPercent(originalPrice, currentPrice),
      promotionType: "outlet",
      isOnSale: true,
      isTimedSale: false,
    };
  }

  // Timed sale (Daily Deal model) only active inside start/end window.
  if (promotionType === "daily_deal") {
    const startDate = toValidDate(product?.dealStartDate);
    const endDate = toValidDate(product?.dealEndDate);

    if (
      timedSaleActive &&
      originalPrice !== null &&
      originalPrice > currentPrice &&
      currentPrice > 0
    ) {
      return {
        effectivePrice: currentPrice,
        originalPrice,
        discountPercent:
          toSafeNumber(product?.discountPercent, null) ||
          calculateDiscountPercent(originalPrice, currentPrice),
        promotionType: "daily_deal",
        isOnSale: true,
        isTimedSale: true,
        dealStartDate: startDate,
        dealEndDate: endDate,
      };
    }

    // If timed sale is upcoming/expired, fallback to base/original price.
    if (originalPrice !== null && originalPrice > 0) {
      return {
        effectivePrice: originalPrice,
        originalPrice: null,
        discountPercent: null,
        promotionType: "normal",
        isOnSale: false,
        isTimedSale: false,
        saleStatus: startDate && endDate
          ? new Date(now).getTime() < startDate.getTime()
            ? "upcoming"
            : "expired"
          : null,
        salePrice: currentPrice,
        dealStartDate: startDate,
        dealEndDate: endDate,
      };
    }
  }

  return {
    effectivePrice: currentPrice,
    originalPrice: null,
    discountPercent: null,
    promotionType: "normal",
    isOnSale: false,
    isTimedSale: false,
  };
};

const applyPercentDiscount = (amount, discountPercent) => {
  const price = toSafeNumber(amount);
  const discount = toSafeNumber(discountPercent);
  if (price <= 0 || discount <= 0 || discount >= 100) return roundMoney(price);
  return roundMoney(price * (1 - discount / 100));
};

const decorateProductPricing = (product, now = new Date()) => {
  if (!product) return product;

  const pricing = resolveProductPricing(product, now);
  const normalized = {
    ...product,
    price: roundMoney(pricing.effectivePrice),
    originalPrice:
      pricing.originalPrice !== null ? roundMoney(pricing.originalPrice) : null,
    discountPercent:
      pricing.discountPercent !== null ? Number(pricing.discountPercent) : null,
    promotionType: pricing.promotionType,
    isOnSale: Boolean(pricing.isOnSale),
    isTimedSale: Boolean(pricing.isTimedSale),
    salePrice:
      product.promotionType === "daily_deal"
        ? roundMoney(toSafeNumber(product.price))
        : null,
    basePrice:
      product.promotionType === "daily_deal" && product.originalPrice
        ? roundMoney(toSafeNumber(product.originalPrice))
        : roundMoney(toSafeNumber(pricing.effectivePrice)),
    saleStartDate: product.dealStartDate || null,
    saleEndDate: product.dealEndDate || null,
  };

  if (!pricing.isTimedSale) {
    normalized.dealStartDate = null;
    normalized.dealEndDate = null;
  }

  return normalized;
};

module.exports = {
  calculateDiscountPercent,
  resolveProductPricing,
  decorateProductPricing,
  applyPercentDiscount,
};
