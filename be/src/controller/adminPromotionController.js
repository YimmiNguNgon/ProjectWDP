const PromotionRequest = require('../models/PromotionRequest');
const Product = require('../models/Product');

/**
 * Get all pending promotion requests (Admin only)
 */
exports.getPendingRequests = async (req, res, next) => {
    try {
        const { type, status = 'pending' } = req.query;

        const filter = { status };
        if (type) filter.requestType = type;

        const requests = await PromotionRequest.find(filter)
            .populate('product', 'title image price condition createdAt quantity')
            .populate('seller', 'username email isEmailVerified')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('getPendingRequests error:', error);
        next(error);
    }
};

/**
 * Approve a promotion request (Admin only)
 */
exports.approveRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const adminId = req.user.userId;

        const request = await PromotionRequest.findById(id).populate('product');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Promotion request not found'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending requests can be approved'
            });
        }

        const product = request.product;
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Associated product not found'
            });
        }

        // Check if product still eligible (not already promoted)
        if (product.promotionType !== 'normal') {
            return res.status(400).json({
                success: false,
                message: 'Product already has an active promotion'
            });
        }

        // Update request
        request.status = 'approved';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        request.adminNotes = adminNotes || '';
        await request.save();

        // Update product
        product.promotionType = request.requestType;
        product.promotionRequest = request._id;
        product.originalPrice = request.originalPrice;
        product.price = request.discountedPrice;
        product.discountPercent = request.discountPercent;

        // Set deal-specific fields
        if (request.requestType === 'daily_deal') {
            product.dealStartDate = request.startDate;
            product.dealEndDate = request.endDate;
            product.dealQuantityLimit = request.quantityLimit;
            product.dealQuantitySold = 0;
        }

        await product.save();

        return res.json({
            success: true,
            message: 'Promotion request approved',
            data: {
                request,
                product
            }
        });

    } catch (error) {
        console.error('approveRequest error:', error);
        next(error);
    }
};

/**
 * Reject a promotion request (Admin only)
 */
exports.rejectRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason, adminNotes } = req.body;
        const adminId = req.user.userId;

        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const request = await PromotionRequest.findById(id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Promotion request not found'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending requests can be rejected'
            });
        }

        // Update request
        request.status = 'rejected';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        request.rejectionReason = rejectionReason;
        request.adminNotes = adminNotes || '';
        await request.save();

        return res.json({
            success: true,
            message: 'Promotion request rejected',
            data: request
        });

    } catch (error) {
        console.error('rejectRequest error:', error);
        next(error);
    }
};

/**
 * Get all requests (Admin only) - for management
 */
exports.getAllRequests = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, status } = req.query;
        const skip = (page - 1) * limit;

        const filter = {};
        if (type) filter.requestType = type;
        if (status) filter.status = status;

        const [requests, total] = await Promise.all([
            PromotionRequest.find(filter)
                .populate('product', 'title image price')
                .populate('seller', 'username email')
                .populate('reviewedBy', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            PromotionRequest.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            data: requests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('getAllRequests error:', error);
        next(error);
    }
};
