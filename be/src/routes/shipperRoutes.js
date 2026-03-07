const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const shipperController = require("../controller/shipperController");

const isShipper = (req, res, next) => {
  if (req.user?.role !== "shipper") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

router.use(protectedRoute, isShipper);

router.get("/orders/available", shipperController.getAvailableOrders);
router.get("/orders/mine", shipperController.getMyOrders);
router.get("/stats", shipperController.getShipperStats);
router.patch("/orders/:id/accept", shipperController.acceptOrder);
router.patch("/orders/:id/reject", shipperController.rejectOrder);
router.patch("/orders/:id/delivered", shipperController.markDelivered);

module.exports = router;
