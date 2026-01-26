const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const orderController = require("../controller/orderController"); 

// Đảm bảo đường dẫn đúng
// Nếu file controller của bạn ở: ../controller/orderController.js (không có s)
// Thì dùng: require("../controller/orderController")

router.get('/', orderController.getOrders);
router.get('/all', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);

module.exports = router;
