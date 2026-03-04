const KEYWORD_GROUPS = {
  illegal: [
    "gun",
    "weapon",
    "bomb",
    "explosive",
    "heroin",
    "cocaine",
    "meth",
    "drug",
    "drugs",
    "terrorist",
    "terrorism",
  ],
  profanity: [
    "fuck",
    "fucking",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "dick",
    "porn",
    "xxx",
    "sex",
    "nude",
  ],
  globalHotWords: [
    "ma tuy",
    "sung",
    "vu khi",
    "thuoc phien",
  ],
};

const PRODUCT_MODERATION_KEYWORDS = [
  ...new Set(
    Object.values(KEYWORD_GROUPS)
      .flat()
      .map((keyword) => String(keyword).trim())
      .filter(Boolean),
  ),
];

module.exports = {
  KEYWORD_GROUPS,
  PRODUCT_MODERATION_KEYWORDS,
};
