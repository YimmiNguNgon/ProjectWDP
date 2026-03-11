const express = require('express');
const router = express.Router();
const { upload, uploadAvatar, uploadProductImages, uploadChatFile, uploadDisputeImages, uploadReportEvidence } = require('../controller/uploadController');
const { protectedRoute } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');

// Upload avatar
router.post('/avatar', protectedRoute, upload.single('avatar'), uploadAvatar);

// Upload product images (multiple)
router.post('/product-images', protectedRoute, upload.array('images', 5), uploadProductImages);

// Upload chat file
router.post('/chat-file', auth, upload.single('file'), uploadChatFile);

// Upload dispute evidence images (max 5)
router.post('/dispute-images', protectedRoute, upload.array('images', 5), uploadDisputeImages);

// Upload report evidence image (buyer, single image)
router.post('/report-evidence', protectedRoute, upload.single('evidence'), uploadReportEvidence);

module.exports = router;

