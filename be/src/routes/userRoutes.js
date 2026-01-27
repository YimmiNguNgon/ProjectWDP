const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');


// Public routes
router.get('/', orderController.getOrders); // Với query params
router.get('/all', orderController.getAllOrders); // Tất cả không phân trang
router.get('/stats', orderController.getOrderStats); // Thống kê

// Order detail
router.get('/:id', orderController.getOrderById);

module.exports = router;
