const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/orderController");

router.post("/", protectedRoute, ctrl.createOrder); // create order (buyer)
router.get("/:id", protectedRoute, ctrl.getOrder);
router.get("/", protectedRoute, ctrl.listOrdersForUser); // ?userId or auth user

module.exports = router;
