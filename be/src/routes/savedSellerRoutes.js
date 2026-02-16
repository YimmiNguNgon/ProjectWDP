const express = require("express");
const router = express.Router();
const {
    getSavedSellers,
    addSavedSeller,
    removeSavedSeller,
} = require("../controller/savedSellerController");
const auth = require("../middleware/auth");

// All routes require authentication
router.use(auth);

// Get all saved sellers
router.get("/", getSavedSellers);

// Add a seller to saved sellers
router.post("/", addSavedSeller);

// Remove a seller from saved sellers
router.delete("/:sellerId", removeSavedSeller);

module.exports = router;
