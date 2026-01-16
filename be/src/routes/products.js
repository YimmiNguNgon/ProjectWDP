const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/productController");

router.post("/", protectedRoute, ctrl.createProduct); // seller creates product
router.get("/:productId", ctrl.getProduct);
router.get("/", ctrl.listProducts);

module.exports = router;
