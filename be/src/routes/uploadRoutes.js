const express = require('express');
const router = express.Router();
const { upload, uploadAvatar, uploadProductImages, uploadChatFile } = require('../controller/uploadController');
const { protectedRoute } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');

// Upload avatar
router.post('/avatar', protectedRoute, upload.single('avatar'), uploadAvatar);

// Upload product images (multiple)
router.post('/product-images', protectedRoute, upload.array('images', 5), uploadProductImages);

// Upload chat file
router.post('/chat-file', auth, upload.single('file'), uploadChatFile);

module.exports = router;
