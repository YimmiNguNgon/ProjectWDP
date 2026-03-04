const {
  normalizeForModeration,
  scanProductText,
} = require("./productContentFilter");

describe("productContentFilter", () => {
  test("returns safe result when content has no prohibited terms", () => {
    const result = scanProductText({
      title: "Wooden dining chair",
      description: "High quality furniture for home",
    });

    expect(result.isBlocked).toBe(false);
    expect(result.matchedTerms).toEqual([]);
    expect(result.reason).toBeNull();
  });

  test("blocks prohibited keyword in title", () => {
    const result = scanProductText({
      title: "Cocaine sample",
      description: "Hidden package",
    });

    expect(result.isBlocked).toBe(true);
    expect(result.matchedTerms).toContain("cocaine");
    expect(result.reason).toContain("cocaine");
  });

  test("blocks prohibited keyword in description", () => {
    const result = scanProductText({
      title: "Camera lens",
      description: "Contains porn material",
    });

    expect(result.isBlocked).toBe(true);
    expect(result.matchedTerms).toContain("porn");
  });

  test("matches Vietnamese content by accent-insensitive normalization", () => {
    const result = scanProductText({
      title: "Hàng cấm ma túy",
      description: "Không hợp pháp",
    });

    expect(result.isBlocked).toBe(true);
    expect(result.matchedTerms).toContain("ma tuy");
  });

  test("matches case-insensitively", () => {
    const result = scanProductText({
      title: "FUCK this item",
      description: "invalid words",
    });

    expect(result.isBlocked).toBe(true);
    expect(result.matchedTerms).toContain("fuck");
  });

  test("deduplicates matched terms", () => {
    const result = scanProductText({
      title: "bomb product",
      description: "this bomb is dangerous",
    });

    const bombTerms = result.matchedTerms.filter((term) => term === "bomb");
    expect(bombTerms.length).toBe(1);
  });

  test("avoids false positives for alnum boundary match", () => {
    const result = scanProductText({
      title: "Penguin toy",
      description: "safe product for kids",
    });

    expect(result.isBlocked).toBe(false);
    expect(result.matchedTerms).not.toContain("gun");
  });

  test("normalizes text by removing accents and lowercasing", () => {
    const normalized = normalizeForModeration("VŨ   KHÍ");
    expect(normalized).toBe("vu khi");
  });
});
