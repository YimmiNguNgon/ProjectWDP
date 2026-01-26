const mongoose = require('mongoose');

const promotionRequestSchema = new mongoose.Schema({
    requestType: {
        type: String,
        enum: ['outlet', 'daily_deal'],
        required: true,
        index: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Pricing
    originalPrice: { type: Number, required: true },
    discountedPrice: { type: Number, required: true },
    discountPercent: { type: Number, required: true },

    // Daily Deal specific fields
    startDate: { type: Date },
    endDate: { type: Date },
    quantityLimit: { type: Number },

    // Eligibility checks (computed at request time)
    eligibilityChecks: {
        conditionNew: { type: Boolean, default: false },
        listingAge: { type: Number, default: 0 }, // days
        listingAgeMet: { type: Boolean, default: false },
        discountMet: { type: Boolean, default: false },
        sellerVerified: { type: Boolean, default: false },
        allPassed: { type: Boolean, default: false }
    },

    // Admin review
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminNotes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for efficient queries
promotionRequestSchema.index({ seller: 1, status: 1 });
promotionRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PromotionRequest', promotionRequestSchema);
