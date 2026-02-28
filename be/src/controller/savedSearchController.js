const SavedSearch = require("../models/SavedSearch");

// Get all saved searches for a user
const getSavedSearches = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;

        const savedSearches = await SavedSearch.find({ userId })
            .populate("filters.categoryId", "name")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: savedSearches,
        });
    } catch (error) {
        console.error("Error fetching saved searches:", error);
        res.status(500).json({
            success: false,
            message: "Không thể tải saved searches",
        });
    }
};

// Create a new saved search
const createSavedSearch = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { searchQuery, filters, name } = req.body;

        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
        }

        const savedSearch = new SavedSearch({
            userId,
            searchQuery,
            filters: filters || {},
            name: name || searchQuery,
        });

        await savedSearch.save();

        await savedSearch.populate("filters.categoryId", "name");

        res.status(201).json({
            success: true,
            message: "Saved search created successfully",
            data: savedSearch,
        });
    } catch (error) {
        console.error("Error creating saved search:", error);
        res.status(500).json({
            success: false,
            message: "Không thể lưu search",
        });
    }
};

// Delete a saved search
const deleteSavedSearch = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { id } = req.params;

        const savedSearch = await SavedSearch.findOneAndDelete({
            _id: id,
            userId,
        });

        if (!savedSearch) {
            return res.status(404).json({
                success: false,
                message: "Saved search not found",
            });
        }

        res.json({
            success: true,
            message: "Saved search deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting saved search:", error);
        res.status(500).json({
            success: false,
            message: "Không thể xóa saved search",
        });
    }
};

// Update a saved search
const updateSavedSearch = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { id } = req.params;
        const { name, filters, notifyNewProducts } = req.body;

        const savedSearch = await SavedSearch.findOne({
            _id: id,
            userId,
        });

        if (!savedSearch) {
            return res.status(404).json({
                success: false,
                message: "Saved search not found",
            });
        }

        // Update fields
        if (name !== undefined) savedSearch.name = name;
        if (filters !== undefined) savedSearch.filters = filters;
        if (notifyNewProducts !== undefined)
            savedSearch.notifyNewProducts = notifyNewProducts;

        await savedSearch.save();
        await savedSearch.populate("filters.categoryId", "name");

        res.json({
            success: true,
            message: "Saved search updated successfully",
            data: savedSearch,
        });
    } catch (error) {
        console.error("Error updating saved search:", error);
        res.status(500).json({
            success: false,
            message: "Không thể cập nhật saved search",
        });
    }
};

// Get product count for a saved search
const getProductCount = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { id } = req.params;
        const Product = require("../models/Product");

        const savedSearch = await SavedSearch.findOne({
            _id: id,
            userId,
        });

        if (!savedSearch) {
            return res.status(404).json({
                success: false,
                message: "Saved search not found",
            });
        }

        // Build query based on saved search filters
        const query = {
            listingStatus: "active",
        };

        // Add search query
        if (savedSearch.searchQuery) {
            query.$or = [
                { title: { $regex: savedSearch.searchQuery, $options: "i" } },
                { description: { $regex: savedSearch.searchQuery, $options: "i" } },
            ];
        }

        // Add filters
        if (savedSearch.filters.categoryId) {
            query.categoryId = savedSearch.filters.categoryId;
        }
        if (savedSearch.filters.minPrice !== undefined) {
            query.price = { ...query.price, $gte: savedSearch.filters.minPrice };
        }
        if (savedSearch.filters.maxPrice !== undefined) {
            query.price = { ...query.price, $lte: savedSearch.filters.maxPrice };
        }
        if (savedSearch.filters.condition) {
            query.condition = savedSearch.filters.condition;
        }

        const count = await Product.countDocuments(query);

        // Update productCount and lastChecked
        savedSearch.productCount = count;
        savedSearch.lastChecked = new Date();
        await savedSearch.save();

        res.json({
            success: true,
            data: {
                count,
                lastChecked: savedSearch.lastChecked,
            },
        });
    } catch (error) {
        console.error("Error getting product count:", error);
        res.status(500).json({
            success: false,
            message: "Không thể lấy product count",
        });
    }
};

module.exports = {
    getSavedSearches,
    createSavedSearch,
    deleteSavedSearch,
    updateSavedSearch,
    getProductCount,
};
