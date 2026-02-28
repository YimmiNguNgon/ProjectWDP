const mongoose = require("mongoose");

const savedSearchSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        searchQuery: {
            type: String,
            required: true,
        },
        filters: {
            categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
            minPrice: { type: Number },
            maxPrice: { type: Number },
            condition: { type: String },
            sortBy: { type: String },
        },
        name: {
            type: String,
            default: "",
        },
        productCount: {
            type: Number,
            default: 0,
        },
        lastChecked: {
            type: Date,
            default: Date.now,
        },
        notifyNewProducts: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Index for faster queries
savedSearchSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SavedSearch", savedSearchSchema);
