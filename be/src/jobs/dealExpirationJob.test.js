jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

jest.mock("../models/Product", () => ({
  find: jest.fn(),
}));

jest.mock("../models/PromotionRequest", () => ({
  findByIdAndUpdate: jest.fn(),
}));

const Product = require("../models/Product");
const PromotionRequest = require("../models/PromotionRequest");
const { expireDeals } = require("./dealExpirationJob");

describe("dealExpirationJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("quantity-based expiration only applies when dealQuantityLimit > 0", async () => {
    Product.find
      .mockResolvedValueOnce([]) // expiredByDate
      .mockResolvedValueOnce([]); // expiredByQuantity

    await expireDeals();

    expect(Product.find).toHaveBeenCalledTimes(2);
    expect(Product.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        promotionType: "daily_deal",
        dealQuantityLimit: { $gt: 0 },
        $expr: {
          $gte: [{ $ifNull: ["$dealQuantitySold", 0] }, "$dealQuantityLimit"],
        },
      }),
    );
  });

  test("deduplicates products found by both date and quantity checks", async () => {
    const firstDoc = {
      _id: "p1",
      promotionType: "daily_deal",
      price: 80,
      originalPrice: 100,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const secondDoc = {
      _id: "p1",
      promotionType: "daily_deal",
      price: 80,
      originalPrice: 100,
      save: jest.fn().mockResolvedValue(undefined),
    };

    Product.find
      .mockResolvedValueOnce([firstDoc]) // expiredByDate
      .mockResolvedValueOnce([secondDoc]); // expiredByQuantity

    await expireDeals();

    expect(firstDoc.save).not.toHaveBeenCalled();
    expect(secondDoc.save).toHaveBeenCalledTimes(1);
    expect(PromotionRequest.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
