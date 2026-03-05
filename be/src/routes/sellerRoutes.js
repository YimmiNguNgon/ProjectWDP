const express = require('express');
const router = express.Router();
const sellerController = require('../controller/sellerController');

// GET /api/seller/:sellerId/products - Lấy danh sách sản phẩm
router.get('/:sellerId/products', sellerController.getSellerProducts);

// GET /api/seller/:sellerId/products/:productId - Lấy chi tiết 1 sản phẩm
router.get('/:sellerId/products/:productId', sellerController.getSellerProductDetail);

// GET /api/seller/:sellerId/stats - Lấy thống kê seller
router.get('/:sellerId/stats', sellerController.getSellerStats);

module.exports = router;