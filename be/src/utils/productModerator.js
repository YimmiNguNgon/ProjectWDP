/**
 * productModerator.js
 * Auto-moderation engine for product listings.
 *
 * Decision flow:
 *   submit → auto-check → REJECTED (hard fail)
 *                       → PENDING  (needs manual review)
 *                       → APPROVED (safe, trusted seller)
 */

const Product = require("../models/Product");
const User = require("../models/User");

// ─── Banned keywords (case-insensitive) ────────────────────────────────────
const BANNED_KEYWORDS = [
    // Scam / fraud
    "scam", "lừa đảo", "giả mạo", "fake",
    // Adult content
    "porn", "xxx", "18+", "sex", "erotic",
    // Illegal items
    "súng", "thuốc phiện", "heroin", "cocaine", "ma túy",
    "vũ khí", "chất nổ", "bomb", "weapon",
    // Hate speech tokens (minimal set)
    "giết người", "khủng bố",
];

// ─── Spam pattern: repeated chars (e.g. "aaaaaa…") ─────────────────────────
const SPAM_PATTERN = /(.)\1{6,}/;

/**
 * Check if text contains banned keywords.
 * @param {string} text
 * @returns {{ flagged: boolean, keyword?: string }}
 */
function checkBannedKeywords(text) {
    const lower = text.toLowerCase();
    for (const kw of BANNED_KEYWORDS) {
        if (lower.includes(kw.toLowerCase())) {
            return { flagged: true, keyword: kw };
        }
    }
    return { flagged: false };
}

/**
 * Check for obvious spam character repetition.
 * @param {string} text
 * @returns {boolean}
 */
function isSpam(text) {
    return SPAM_PATTERN.test(text);
}

/**
 * Calculate seller trust score (0–100).
 * Higher score → more likely to be AUTO_APPROVED.
 *
 * Factors:
 *   + Products already APPROVED  → +2 each (max +40)
 *   + violationCount             → -10 each
 *   + warningCount               → -5 each
 *   + isEmailVerified            → +10
 *   + base score                 → 30
 */
async function getSellerScore(sellerId) {
    const seller = await User.findById(sellerId).lean();
    if (!seller) return 0;

    let score = 30; // base

    if (seller.isEmailVerified) score += 10;

    // Penalize violations / warnings
    score -= (seller.violationCount || 0) * 10;
    score -= (seller.warningCount || 0) * 5;

    // Reward past successful listings
    const approvedCount = await Product.countDocuments({
        sellerId,
        moderationStatus: "APPROVED",
        listingStatus: { $ne: "deleted" },
    });
    score += Math.min(approvedCount * 2, 40);

    return Math.max(0, Math.min(100, score));
}

/**
 * Check duplicate product for same seller.
 * Rule: same (sellerId + title + categoryId) where not deleted/rejected.
 * @param {string} sellerId
 * @param {string} title
 * @param {string} categoryId
 * @param {string|null} excludeId  – product ID to exclude (for edits)
 * @returns {{ isDuplicate: boolean }}
 */
async function checkDuplicate(sellerId, title, categoryId, excludeId = null) {
    const query = {
        sellerId,
        title: new RegExp(`^${title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        listingStatus: { $ne: "deleted" },
        moderationStatus: { $nin: ["REJECTED"] },
    };
    if (categoryId) query.categoryId = categoryId;
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Product.findOne(query).lean();
    return { isDuplicate: !!existing };
}

/**
 * Main auto-moderation function.
 *
 * @param {Object} params
 * @param {string} params.sellerId
 * @param {string} params.title
 * @param {string} params.description
 * @param {number} params.price
 * @param {string[]} params.images   – array of image URLs
 * @param {string}   params.categoryId
 * @param {string|null} params.excludeId  – pass product._id when editing
 *
 * @returns {Promise<{
 *   decision: 'APPROVED'|'PENDING'|'REJECTED',
 *   reason: string,
 *   sellerScore: number,
 * }>}
 */
async function autoModerate({ sellerId, title, description, price, images, categoryId, excludeId = null }) {

    const fullText = `${title} ${description}`;

    // ── HARD REJECT checks ───────────────────────────────────────────────────
    if (!price || price <= 0) {
        return { decision: "REJECTED", reason: "Giá sản phẩm phải lớn hơn 0", sellerScore: 0 };
    }

    if (!images || images.length === 0) {
        return { decision: "REJECTED", reason: "Sản phẩm phải có ít nhất 1 hình ảnh", sellerScore: 0 };
    }

    const banned = checkBannedKeywords(fullText);
    if (banned.flagged) {
        return {
            decision: "REJECTED",
            reason: `Nội dung chứa từ khóa bị cấm: "${banned.keyword}"`,
            sellerScore: 0,
        };
    }

    if (isSpam(fullText)) {
        return { decision: "REJECTED", reason: "Nội dung spam hoặc lặp ký tự bất thường", sellerScore: 0 };
    }

    const { isDuplicate } = await checkDuplicate(sellerId, title, categoryId, excludeId);
    if (isDuplicate) {
        return {
            decision: "REJECTED",
            reason: "Bạn đã có sản phẩm trùng tên trong cùng danh mục. Vui lòng chỉnh sửa sản phẩm hiện có.",
            sellerScore: 0,
        };
    }

    // ── Compute seller score ─────────────────────────────────────────────────
    const sellerScore = await getSellerScore(sellerId);

    // ── PENDING if seller is new (score < 40) or has violations ─────────────
    const seller = await User.findById(sellerId).lean();
    const hasViolations = (seller?.violationCount || 0) > 0;
    const isFirstProduct = (await Product.countDocuments({ sellerId })) === 0;

    if (isFirstProduct || hasViolations || sellerScore < 40) {
        return {
            decision: "PENDING",
            reason: isFirstProduct
                ? "Seller đăng sản phẩm lần đầu – chờ admin duyệt"
                : hasViolations
                    ? "Seller có lịch sử vi phạm – chờ admin duyệt"
                    : "Điểm uy tín chưa đủ – chờ admin duyệt",
            sellerScore,
        };
    }

    // ── AUTO APPROVED ────────────────────────────────────────────────────────
    return {
        decision: "APPROVED",
        reason: "Đã vượt qua kiểm duyệt tự động",
        sellerScore,
    };
}

module.exports = { autoModerate, checkDuplicate, getSellerScore };
