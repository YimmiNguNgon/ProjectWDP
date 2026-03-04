const {
  resolveProductPricing,
  decorateProductPricing,
  applyPercentDiscount,
} = require("./productPricing");

describe("productPricing", () => {
  test("returns active timed sale pricing inside time window", () => {
    const now = new Date("2026-03-04T12:00:00.000Z");
    const pricing = resolveProductPricing(
      {
        promotionType: "daily_deal",
        price: 80,
        originalPrice: 100,
        discountPercent: 20,
        dealStartDate: "2026-03-04T00:00:00.000Z",
        dealEndDate: "2026-03-05T00:00:00.000Z",
      },
      now,
    );

    expect(pricing.isOnSale).toBe(true);
    expect(pricing.effectivePrice).toBe(80);
    expect(pricing.originalPrice).toBe(100);
    expect(pricing.promotionType).toBe("daily_deal");
  });

  test("reverts timed sale pricing after expiration", () => {
    const now = new Date("2026-03-06T12:00:00.000Z");
    const pricing = resolveProductPricing(
      {
        promotionType: "daily_deal",
        price: 80,
        originalPrice: 100,
        dealStartDate: "2026-03-04T00:00:00.000Z",
        dealEndDate: "2026-03-05T00:00:00.000Z",
      },
      now,
    );

    expect(pricing.isOnSale).toBe(false);
    expect(pricing.effectivePrice).toBe(100);
    expect(pricing.promotionType).toBe("normal");
  });

  test("decorates product with normalized pricing fields", () => {
    const now = new Date("2026-03-04T12:00:00.000Z");
    const product = decorateProductPricing(
      {
        _id: "1",
        title: "Item",
        promotionType: "daily_deal",
        price: 75,
        originalPrice: 100,
        discountPercent: 25,
        dealStartDate: "2026-03-04T00:00:00.000Z",
        dealEndDate: "2026-03-05T00:00:00.000Z",
      },
      now,
    );

    expect(product.price).toBe(75);
    expect(product.originalPrice).toBe(100);
    expect(product.isOnSale).toBe(true);
    expect(product.basePrice).toBe(100);
  });

  test("applies discount percent with 2-decimal rounding", () => {
    expect(applyPercentDiscount(99.99, 10)).toBe(89.99);
  });
});
