const {
  isNewAccount,
  calculateReportWeight,
  calculateSellerRiskScore,
  shouldFlagSeller,
  detectSuspiciousPattern
} = require("./reportAntiAbuseService");

describe("reportAntiAbuseService", () => {
  describe("isNewAccount", () => {
    it("should return true for a new account", () => {
      expect(isNewAccount(new Date().toISOString())).toBe(true);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(isNewAccount(twoDaysAgo)).toBe(true);
    });

    it("should return false for an account older than 3 days", () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      expect(isNewAccount(fourDaysAgo)).toBe(false);
    });
  });

  describe("calculateReportWeight", () => {
    it("should return LOW_ACCURACY weight (0.0) if accuracy < 0.3 and totalEvaluated >= 5", () => {
      const buyer = { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() };
      const stats = { validReports: 1, rejectedReports: 5, accuracyScore: 0.16 };
      expect(calculateReportWeight(buyer, stats)).toBe(0.0);
    });

    it("should return NEW_ACCOUNT weight (0.2) if account < 3 days old and accuracy normal", () => {
      const buyer = { createdAt: new Date().toISOString() };
      const stats = { validReports: 0, rejectedReports: 0, accuracyScore: 1.0 };
      expect(calculateReportWeight(buyer, stats)).toBe(0.2);
    });

    it("should return TRUSTED weight (2.0) if totalEvaluated >= 10 and accuracy > 0.8", () => {
      const buyer = { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() };
      const stats = { validReports: 9, rejectedReports: 1, accuracyScore: 0.9 };
      expect(calculateReportWeight(buyer, stats)).toBe(2.0);
    });

    it("should return NORMAL weight (1.0) for standard accounts", () => {
      const buyer = { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() };
      const stats = { validReports: 2, rejectedReports: 1, accuracyScore: 0.66 };
      expect(calculateReportWeight(buyer, stats)).toBe(1.0);
    });
  });

  describe("calculateSellerRiskScore", () => {
    it("should sum the weights of only VALID reports", () => {
      const reports = [
        { status: "VALID", weight: 1.0 },
        { status: "VALID", weight: 2.0 },
        { status: "REJECTED", weight: 1.0 },
        { status: "PENDING", weight: 1.0 }
      ];
      expect(calculateSellerRiskScore(reports)).toBe(3.0);
    });
  });

  describe("shouldFlagSeller", () => {
    it("should return false if less than 3 valid reports", () => {
      const reports = [
        { status: "VALID", buyer: "u1" },
        { status: "VALID", buyer: "u2" }
      ];
      expect(shouldFlagSeller(reports)).toBe(false);
    });

    it("should return false if less than 3 unique users", () => {
      const reports = [
        { status: "VALID", buyer: "u1" },
        { status: "VALID", buyer: "u1" },
        { status: "VALID", buyer: "u2" }
      ];
      expect(shouldFlagSeller(reports)).toBe(false);
    });

    it("should return true if >= 3 valid reports AND >= 3 unique users", () => {
      const reports = [
        { status: "VALID", buyer: { _id: "u1" } },
        { status: "VALID", buyer: { _id: "u2" } },
        { status: "VALID", buyer: { _id: "u3" } }
      ];
      expect(shouldFlagSeller(reports)).toBe(true);
    });
  });

  describe("detectSuspiciousPattern", () => {
    it("should return false if total reports < 5", () => {
      const reports = Array(4).fill({ buyer: { createdAt: new Date().toISOString() } });
      expect(detectSuspiciousPattern(reports)).toBe(false);
    });

    it("should detect new account cluster (>70% new accounts)", () => {
      const reports = Array(5).fill({ buyer: { createdAt: new Date().toISOString() } }); // All new accounts
      expect(detectSuspiciousPattern(reports)).toBe(true);
    });

    it("should detect same IP domination", () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      // 5 reports, 4 from same IP
      const reports = [
        { buyer: { createdAt: oldDate }, ipAddress: "1.1.1.1" },
        { buyer: { createdAt: oldDate }, ipAddress: "1.1.1.1" },
        { buyer: { createdAt: oldDate }, ipAddress: "1.1.1.1" },
        { buyer: { createdAt: oldDate }, ipAddress: "1.1.1.1" },
        { buyer: { createdAt: oldDate }, ipAddress: "2.2.2.2" },
      ];
      expect(detectSuspiciousPattern(reports)).toBe(true);
    });
  });
});
