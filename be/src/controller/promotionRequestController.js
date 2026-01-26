const PromotionRequest = require('../models/PromotionRequest');
const Product = require('../models/Product');
const {
    checkOutletEligibility,
    validateDailyDealParams,
    canCreatePromotionRequest,
    calculateDiscountPercent
} = require('../services/promotionValidationService');

/**
 * Request Brand Outlet status for a product
 */
exports.requestOutlet = async (req, res, next) => {
    try {
        const { productId, discountedPrice } = req.body;
        const sellerId = req.user.userId;

        if (!productId || !discountedPrice) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and discounted price are required'
            });
        }

        // Check authorization
        const authCheck = await canCreatePromotionRequest(productId, sellerId);
        if (!authCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: authCheck.reason
            });
        }

        const product = authCheck.product;
        const originalPrice = product.price;

        // Validate pricing
        if (discountedPrice >= originalPrice) {
            return res.status(400).json({
                success: false,
                message: 'Discounted price must be lower than original price'
            });
        }

        if (discountedPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Discounted price must be greater than 0'
            });
        }

        // Calculate discount
        const discountPercent = calculateDiscountPercent(originalPrice, discountedPrice);

        // Check eligibility
        const eligibility = await checkOutletEligibility(product, sellerId, discountPercent);

        // Create promotion request
        const promotionRequest = await PromotionRequest.create({
            requestType: 'outlet',
            product: productId,
            seller: sellerId,
            originalPrice,
            discountedPrice,
            discountPercent,
            eligibilityChecks: eligibility
        });

        await promotionRequest.populate('product seller');

        return res.status(201).json({
            success: true,
            message: 'Brand Outlet request submitted',
            data: promotionRequest,
            eligibility
        });

    } catch (error) {
        console.error('requestOutlet error:', error);
        next(error);
    }
};

/**
 * Request Daily Deal status for a product
 */
exports.requestDailyDeal = async (req, res, next) => {
    try {
        const { productId, discountedPrice, startDate, endDate, quantityLimit } = req.body;
        const sellerId = req.user.userId;

        if (!productId || !discountedPrice || !startDate || !endDate || !quantityLimit) {
            return res.status(400).json({
                success: false,
                message: 'All deal fields are required'
            });
        }

        // Check authorization
        const authCheck = await canCreatePromotionRequest(productId, sellerId);
        if (!authCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: authCheck.reason
            });
        }

        const product = authCheck.product;
        const originalPrice = product.price;

        // Validate pricing
        if (discountedPrice >= originalPrice || discountedPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid discounted price'
            });
        }

        // Calculate discount
        const discountPercent = calculateDiscountPercent(originalPrice, discountedPrice);

        // Validate deal parameters
        const validation = validateDailyDealParams(startDate, endDate, quantityLimit, discountPercent);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid deal parameters',
                errors: validation.errors
            });
        }

        // Check basic eligibility (seller verified)
        const User = require('../models/User');
        const seller = await User.findById(sellerId);
        const sellerVerified = seller?.isEmailVerified === true;

        const eligibility = {
            sellerVerified,
            validDates: validation.isValid,
            allPassed: sellerVerified && validation.isValid
        };

        // Create promotion request
        const promotionRequest = await PromotionRequest.create({
            requestType: 'daily_deal',
            product: productId,
            seller: sellerId,
            originalPrice,
            discountedPrice,
            discountPercent,
            startDate,
            endDate,
            quantityLimit,
            eligibilityChecks: {
                sellerVerified,
                allPassed: eligibility.allPassed
            }
        });

        await promotionRequest.populate('product seller');

        return res.status(201).json({
            success: true,
            message: 'Daily Deal request submitted',
            data: promotionRequest,
            eligibility
        });

    } catch (error) {
        console.error('requestDailyDeal error:', error);
        next(error);
    }
};

/**
 * Get seller's promotion requests
 */
exports.getMyRequests = async (req, res, next) => {
    try {
        const sellerId = req.user.userId;
        const { status, type } = req.query;

        const filter = { seller: sellerId };
        if (status) filter.status = status;
        if (type) filter.requestType = type;

        const requests = await PromotionRequest.find(filter)
            .populate('product', 'title image price condition createdAt')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('getMyRequests error:', error);
        next(error);
    }
};

/**
 * Cancel a pending promotion request
 */
exports.cancelRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.userId;

        const request = await PromotionRequest.findById(id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Promotion request not found'
            });
        }

        // Check ownership
        if (request.seller.toString() !== sellerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Can only cancel pending requests
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only cancel pending requests'
            });
        }

        request.status = 'cancelled';
        await request.save();

        return res.json({
            success: true,
            message: 'Promotion request cancelled'
        });

    } catch (error) {
        console.error('cancelRequest error:', error);
        next(error);
    }
};
