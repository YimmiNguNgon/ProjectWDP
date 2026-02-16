const User = require("../models/User");

// Get all saved sellers for a user
const getSavedSellers = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { sortBy = "newest" } = req.query; // newest, rating, products
        const Product = require("../models/Product");

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Populate saved sellers with full info
        await user.populate(
            "savedSellers",
            "username email avatarUrl reputationScore"
        );

        // Get product count for each seller
        const sellersWithProductCount = await Promise.all(
            user.savedSellers.map(async (seller) => {
                const productCount = await Product.countDocuments({
                    sellerId: seller._id,
                    listingStatus: "active",
                });

                return {
                    ...seller.toObject(),
                    productCount,
                };
            })
        );

        // Sort based on query param
        let sorted = [...sellersWithProductCount];
        if (sortBy === "rating") {
            sorted.sort((a, b) => b.reputationScore - a.reputationScore);
        } else if (sortBy === "products") {
            sorted.sort((a, b) => b.productCount - a.productCount);
        }
        // Default 'newest' - already in order from savedSellers array

        res.json({
            success: true,
            data: sorted,
        });
    } catch (error) {
        console.error("Error fetching saved sellers:", error);
        res.status(500).json({
            success: false,
            message: "Không thể tải saved sellers",
        });
    }
};

// Add a seller to saved sellers
const addSavedSeller = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { sellerId } = req.body;

        console.log("[addSavedSeller] userId:", userId, "sellerId:", sellerId);

        if (!sellerId) {
            return res.status(400).json({
                success: false,
                message: "Seller ID is required",
            });
        }

        // Check if seller exists
        const seller = await User.findById(sellerId);
        if (!seller) {
            console.log("[addSavedSeller] Seller not found:", sellerId);
            return res.status(404).json({
                success: false,
                message: "Seller not found",
            });
        }

        // Add seller to saved sellers if not already saved
        const user = await User.findById(userId);
        if (!user) {
            console.log("[addSavedSeller] User not found:", userId);
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Initialize savedSellers array if it doesn't exist
        if (!user.savedSellers) {
            user.savedSellers = [];
        }

        if (user.savedSellers.includes(sellerId)) {
            return res.status(400).json({
                success: false,
                message: "Seller already saved",
            });
        }

        user.savedSellers.push(sellerId);
        await user.save();

        await user.populate(
            "savedSellers",
            "username email avatarUrl reputationScore"
        );

        console.log("[addSavedSeller] Success! Saved sellers:", user.savedSellers.length);

        res.status(201).json({
            success: true,
            message: "Seller saved successfully",
            data: user.savedSellers,
        });
    } catch (error) {
        console.error("[addSavedSeller] Error:", error.message);
        console.error("[addSavedSeller] Stack:", error.stack);
        res.status(500).json({
            success: false,
            message: "Không thể lưu seller",
            error: error.message,
        });
    }
};

// Remove a seller from saved sellers
const removeSavedSeller = async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const { sellerId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Remove seller from saved sellers
        user.savedSellers = user.savedSellers.filter(
            (id) => id.toString() !== sellerId
        );
        await user.save();

        res.json({
            success: true,
            message: "Seller removed from saved sellers",
        });
    } catch (error) {
        console.error("Error removing saved seller:", error);
        res.status(500).json({
            success: false,
            message: "Không thể xóa saved seller",
        });
    }
};

module.exports = {
    getSavedSellers,
    addSavedSeller,
    removeSavedSeller,
};
