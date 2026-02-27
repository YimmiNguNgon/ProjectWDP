const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const orderController = require("../controller/orderController");


router.post("/", protectedRoute, orderController.createOrder);
router.get('/all', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);
router.get('/', protectedRoute, orderController.getOrders);

module.exports = router;
