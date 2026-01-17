const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/categoryController");

router.get("/", ctrl.listCategories);
router.post("/", protectedRoute, ctrl.createCategory);

module.exports = router;
