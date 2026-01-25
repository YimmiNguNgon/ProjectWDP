const express = require('express');
const router = express.Router();
const { upload, uploadAvatar, uploadProductImages } = require('../controller/uploadController');
const { protectedRoute } = require('../middleware/authMiddleware');

// Upload avatar
router.post('/avatar', protectedRoute, upload.single('avatar'), uploadAvatar);

// Upload product images (multiple)
router.post('/product-images', protectedRoute, upload.array('images', 5), uploadProductImages);

module.exports = router;
