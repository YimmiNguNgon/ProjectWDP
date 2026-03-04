const crypto = require("crypto");

const BAN_APPEAL_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const hashBanAppealToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

const generateBanAppealToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashBanAppealToken(rawToken);
  const expiresAt = new Date(Date.now() + BAN_APPEAL_TOKEN_TTL_MS);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
};

module.exports = {
  BAN_APPEAL_TOKEN_TTL_MS,
  generateBanAppealToken,
  hashBanAppealToken,
};
