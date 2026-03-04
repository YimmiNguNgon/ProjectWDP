const {
  PRODUCT_MODERATION_KEYWORDS,
} = require("../config/productModerationKeywords");

const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;
const ALNUM_REGEX = /^[a-z0-9]+$/;

function escapeRegex(input = "") {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForModeration(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(COMBINING_MARKS_REGEX, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_KEYWORDS = PRODUCT_MODERATION_KEYWORDS.map((rawKeyword) => {
  const normalized = normalizeForModeration(rawKeyword);
  return {
    raw: rawKeyword,
    normalized,
    isSingleToken: !normalized.includes(" "),
    isAlnumOnly: ALNUM_REGEX.test(normalized),
  };
}).filter((entry) => entry.normalized);

function hasWordBoundaryMatch(content, keyword) {
  const escaped = escapeRegex(keyword);
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(content);
}

function scanProductText({ title = "", description = "" } = {}) {
  const normalizedContent = normalizeForModeration(`${title} ${description}`);
  const matchedTerms = [];

  if (!normalizedContent) {
    return { isBlocked: false, matchedTerms: [], reason: null };
  }

  for (const entry of NORMALIZED_KEYWORDS) {
    const { raw, normalized, isSingleToken, isAlnumOnly } = entry;
    let matched = false;

    if (!isSingleToken) {
      matched = normalizedContent.includes(normalized);
    } else if (isAlnumOnly) {
      matched = hasWordBoundaryMatch(normalizedContent, normalized);
    } else {
      matched = normalizedContent.includes(normalized);
    }

    if (matched && !matchedTerms.includes(raw)) {
      matchedTerms.push(raw);
    }
  }

  if (matchedTerms.length === 0) {
    return { isBlocked: false, matchedTerms: [], reason: null };
  }

  return {
    isBlocked: true,
    matchedTerms,
    reason: `Product was rejected because it contains prohibited words: ${matchedTerms.join(", ")}`,
  };
}

module.exports = {
  normalizeForModeration,
  scanProductText,
};
