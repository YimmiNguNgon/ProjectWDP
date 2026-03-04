const {
  BAN_APPEAL_TOKEN_TTL_MS,
  generateBanAppealToken,
  hashBanAppealToken,
} = require("./banAppealToken");

describe("banAppealToken utils", () => {
  test("generates raw token and hash", () => {
    const token = generateBanAppealToken();
    expect(token.rawToken).toBeTruthy();
    expect(token.tokenHash).toHaveLength(64);
    expect(hashBanAppealToken(token.rawToken)).toBe(token.tokenHash);
  });

  test("sets token expiry in the future", () => {
    const before = Date.now();
    const token = generateBanAppealToken();
    const delta = token.expiresAt.getTime() - before;
    expect(delta).toBeGreaterThan(BAN_APPEAL_TOKEN_TTL_MS - 2000);
    expect(delta).toBeLessThan(BAN_APPEAL_TOKEN_TTL_MS + 2000);
  });
});
