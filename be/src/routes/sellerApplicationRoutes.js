const express = require("express");
const router = express.Router();
const sellerApplicationController = require("../controller/sellerApplicationController");
const { protectedRoute } = require("../middleware/authMiddleware");

// User routes - yêu cầu đăng nhập
router.use(protectedRoute);

// User gửi đơn
router.post("/", sellerApplicationController.submitApplication);

// User xem trạng thái đơn của mình
router.get("/my", sellerApplicationController.getMyApplication);

module.exports = router;
