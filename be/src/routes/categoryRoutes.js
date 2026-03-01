const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/categoryController");

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin only" });
  }
  next();
};

router.get("/", ctrl.listCategories);
router.post("/", protectedRoute, requireAdmin, ctrl.createCategory);

module.exports = router;
