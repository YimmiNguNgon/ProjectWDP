const express = require('express');
const router = express.Router();
const { protectedRoute } = require('../middleware/authMiddleware');
const promotionCtrl = require('../controller/promotionRequestController');
const adminPromoCtrl = require('../controller/adminPromotionController');

// ========== Seller Routes ==========
// Request Brand Outlet status
router.post('/request/outlet', protectedRoute, promotionCtrl.requestOutlet);

// Request Daily Deal status
router.post('/request/daily-deal', protectedRoute, promotionCtrl.requestDailyDeal);

// Get my promotion requests
router.get('/my-requests', protectedRoute, promotionCtrl.getMyRequests);

// Cancel a pending request
router.delete('/request/:id', protectedRoute, promotionCtrl.cancelRequest);

// ========== Admin Routes ==========
// Middleware to check admin role
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Get pending requests
router.get('/admin/pending', protectedRoute, adminOnly, adminPromoCtrl.getPendingRequests);

// Get all requests (with filters)
router.get('/admin/all', protectedRoute, adminOnly, adminPromoCtrl.getAllRequests);

// Approve request
router.post('/admin/:id/approve', protectedRoute, adminOnly, adminPromoCtrl.approveRequest);

// Reject request
router.post('/admin/:id/reject', protectedRoute, adminOnly, adminPromoCtrl.rejectRequest);

module.exports = router;
