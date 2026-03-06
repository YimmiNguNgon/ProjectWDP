const User = require("../models/User");

// ── Helper: lấy userId từ req.user (tương thích cả 2 middleware auth) ─────────
function getUserId(req) {
    return req.user?._id || req.user?.userId || req.user?.id;
}

// Get all saved sellers for a user
const getSavedSellers = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { sortBy = "newest" } = req.query;
        const Product = require("../models/Product");
        const VerifiedBadge = require("../models/VerifiedBadge");

        const user = await User.findById(userId)
            .populate("savedSellers", "username email avatarUrl reputationScore sellerInfo")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Get product count & verified badge for each seller
        const sellersWithMeta = await Promise.all(
            (user.savedSellers || []).map(async (seller) => {
                const [productCount, badgeDoc] = await Promise.all([
                    Product.countDocuments({ sellerId: seller._id, listingStatus: "active" }),
                    VerifiedBadge.findOne({ seller: seller._id }).select("isVerified").lean(),
                ]);

                return {
                    ...seller,
                    productCount,
                    isVerifiedSeller: seller.sellerInfo?.isVerifiedSeller ?? badgeDoc?.isVerified ?? false,
                };
            })
        );

        // Sort based on query param
        let sorted = [...sellersWithMeta];
        if (sortBy === "rating") {
            sorted.sort((a, b) => b.reputationScore - a.reputationScore);
        } else if (sortBy === "products") {
            sorted.sort((a, b) => b.productCount - a.productCount);
        }

        return res.json({ success: true, data: sorted });
    } catch (error) {
        console.error("Error fetching saved sellers:", error);
        return res.status(500).json({
            success: false,
            message: "Không thể tải saved sellers",
            error: error.message,
        });
    }
};

// Add a seller to saved sellers
const addSavedSeller = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { sellerId } = req.body;

        console.log("[addSavedSeller] userId:", userId, "sellerId:", sellerId);

        if (!sellerId) {
            return res.status(400).json({ success: false, message: "Seller ID is required" });
        }
        if (String(sellerId) === String(userId)) {
            return res.status(400).json({ success: false, message: "Cannot save yourself as a seller" });
        }

        // Check if seller exists
        const seller = await User.findById(sellerId).select("role username").lean();
        if (!seller) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }
        if (seller.role !== "seller") {
            return res.status(400).json({ success: false, message: "Only seller accounts can be saved" });
        }

        // Dùng $addToSet: tự động không thêm trùng, không cần pre-check
        try {
            const updated = await User.findByIdAndUpdate(
                userId,
                { $addToSet: { savedSellers: sellerId } },
                { new: true, select: "savedSellers" }
            );

            if (!updated) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
        } catch (updateErr) {
            // Nếu savedSellers bị lưu sai kiểu (string thay vì array) → tự sửa rồi retry
            if (updateErr.message && updateErr.message.includes("non-array")) {
                console.warn("[addSavedSeller] savedSellers is corrupted, auto-fixing for user:", userId);
                await User.findByIdAndUpdate(
                    userId,
                    { $set: { savedSellers: [sellerId] } }
                );
            } else {
                throw updateErr;
            }
        }


        console.log("[addSavedSeller] Success! Seller saved:", seller.username);

        return res.status(201).json({
            success: true,
            message: "Seller saved successfully",
        });
    } catch (error) {
        console.error("[addSavedSeller] Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Không thể lưu seller",
            error: error.message,
        });
    }
};

// Remove a seller from saved sellers
const removeSavedSeller = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { sellerId } = req.params;

        // Dùng $pull thay vì .save() để tránh lỗi validation toàn schema
        const result = await User.findByIdAndUpdate(
            userId,
            { $pull: { savedSellers: sellerId } },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, message: "Seller removed from saved sellers" });
    } catch (error) {
        console.error("Error removing saved seller:", error);
        return res.status(500).json({
            success: false,
            message: "Không thể xóa saved seller",
            error: error.message,
        });
    }
};

module.exports = {
    getSavedSellers,
    addSavedSeller,
    removeSavedSeller,
};
