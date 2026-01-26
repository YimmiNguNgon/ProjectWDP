const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Promotion Validation Service
 * Validates eligibility for Brand Outlet and Daily Deal promotions
 */

/**
 * Check if product meets Brand Outlet eligibility criteria
 * @param {Object} product - Product document
 * @param {String} sellerId - Seller ID
 * @param {Number} discountPercent - Proposed discount percentage
 * @returns {Object} Eligibility check results
 */
async function checkOutletEligibility(product, sellerId, discountPercent) {
    try {
        // Get seller info
        const seller = await User.findById(sellerId);
        if (!seller) {
            throw new Error('Seller not found');
        }

        // Calculate listing age in days
        const listingAge = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const listingAgeDays = Math.floor(listingAge);

        // Eligibility checks
        const checks = {
            conditionNew: product.condition?.toLowerCase() === 'new',
            listingAge: listingAgeDays,
            listingAgeMet: listingAgeDays >= 60,
            discountMet: discountPercent >= 30,
            sellerVerified: seller.isEmailVerified === true
        };

        // All checks must pass
        checks.allPassed = checks.conditionNew &&
            checks.listingAgeMet &&
            checks.discountMet &&
            checks.sellerVerified;

        return checks;
    } catch (error) {
        console.error('checkOutletEligibility error:', error);
        throw error;
    }
}

/**
 * Validate Daily Deal parameters
 * @param {Date} startDate - Deal start date
 * @param {Date} endDate - Deal end date
 * @param {Number} quantityLimit - Quantity limit
 * @param {Number} discountPercent - Discount percentage
 * @returns {Object} Validation result
 */
function validateDailyDealParams(startDate, endDate, quantityLimit, discountPercent) {
    const errors = [];
    const now = new Date();

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        errors.push('Invalid start date');
    }
    if (isNaN(end.getTime())) {
        errors.push('Invalid end date');
    }
    if (start >= end) {
        errors.push('Start date must be before end date');
    }
    if (end <= now) {
        errors.push('End date must be in the future');
    }

    // Validate quantity
    if (!quantityLimit || quantityLimit <= 0) {
        errors.push('Quantity limit must be greater than 0');
    }

    // Validate discount
    if (!discountPercent || discountPercent < 10 || discountPercent > 90) {
        errors.push('Discount must be between 10% and 90%');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Check if seller can create promotion request
 * @param {String} productId - Product ID
 * @param {String} sellerId - Seller ID
 * @returns {Object} Authorization result
 */
async function canCreatePromotionRequest(productId, sellerId) {
    try {
        const product = await Product.findById(productId);

        if (!product) {
            return { allowed: false, reason: 'Product not found' };
        }

        // Check ownership
        if (product.sellerId.toString() !== sellerId.toString()) {
            return { allowed: false, reason: 'You do not own this product' };
        }

        // Check if product is active
        if (product.listingStatus !== 'active') {
            return { allowed: false, reason: 'Product must be active to request promotion' };
        }

        // Check if already has active promotion
        if (product.promotionType !== 'normal') {
            return { allowed: false, reason: 'Product already has an active promotion' };
        }

        return { allowed: true, product };
    } catch (error) {
        console.error('canCreatePromotionRequest error:', error);
        return { allowed: false, reason: error.message };
    }
}

/**
 * Calculate discount percentage
 * @param {Number} originalPrice - Original price
 * @param {Number} discountedPrice - Discounted price
 * @returns {Number} Discount percentage
 */
function calculateDiscountPercent(originalPrice, discountedPrice) {
    if (!originalPrice || originalPrice <= 0) return 0;
    if (!discountedPrice || discountedPrice < 0) return 0;
    if (discountedPrice >= originalPrice) return 0;

    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

module.exports = {
    checkOutletEligibility,
    validateDailyDealParams,
    canCreatePromotionRequest,
    calculateDiscountPercent
};
