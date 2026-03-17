const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/revenueController");

const requireSeller = (req, res, next) => {
  if (req.user?.role !== "seller") return res.status(403).json({ message: "Forbidden" });
  next();
};
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
};

router.get("/seller", protectedRoute, requireSeller, ctrl.getSellerRevenue);
router.get("/admin", protectedRoute, requireAdmin, ctrl.getAdminRevenue);

module.exports = router;
