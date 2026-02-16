const express = require("express");
const router = express.Router();
const {
    getSavedSearches,
    createSavedSearch,
    deleteSavedSearch,
    updateSavedSearch,
    getProductCount,
} = require("../controller/savedSearchController");
const auth = require("../middleware/auth");

// All routes require authentication
router.use(auth);

// Get all saved searches
router.get("/", getSavedSearches);

// Create a new saved search
router.post("/", createSavedSearch);

// Update a saved search
router.put("/:id", updateSavedSearch);

// Get product count for a saved search
router.get("/:id/count", getProductCount);

// Delete a saved search
router.delete("/:id", deleteSavedSearch);

module.exports = router;
