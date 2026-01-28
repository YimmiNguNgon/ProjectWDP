const express = require("express");
const addressController = require("../controller/addressController.js");
const { protectedRoute } = require("../middleware/authMiddleware");

const router = express.Router();

// post api
router.post("/", protectedRoute, addressController.createAddress);
router.post(
  "/delete-address/:id",
  protectedRoute,
  addressController.deleteAddress,
);

// get api
router.get("/", protectedRoute, addressController.getAddresses);

// put api
router.put(
  "/update-address/:id",
  protectedRoute,
  addressController.updateAddress,
);
router.put(
  "/set-default-address/:id",
  protectedRoute,
  addressController.setDefaultAddress,
);

module.exports = router;
