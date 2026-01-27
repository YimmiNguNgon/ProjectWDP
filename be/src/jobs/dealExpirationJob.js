const cron = require('node-cron');
const Product = require('../models/Product');
const PromotionRequest = require('../models/PromotionRequest');

/**
 * Check and expire Daily Deals that have passed their end date
 * or reached their quantity limit
 */
async function expireDeals() {
    try {
        const now = new Date();
        console.log('[Deal Expiration Job] Running at:', now.toISOString());

        // Find deals that have expired by date
        const expiredByDate = await Product.find({
            promotionType: 'daily_deal',
            dealEndDate: { $lt: now }
        });

        // Find deals that are sold out
        const expiredByQuantity = await Product.find({
            promotionType: 'daily_deal',
            $expr: { $gte: ['$dealQuantitySold', '$dealQuantityLimit'] }
        });

        // Combine both arrays and remove duplicates
        const allExpired = [...new Set([...expiredByDate, ...expiredByQuantity])];

        if (allExpired.length === 0) {
            console.log('[Deal Expiration Job] No expired deals found');
            return;
        }

        console.log(`[Deal Expiration Job] Found ${allExpired.length} expired deals`);

        // Process each expired deal
        for (const product of allExpired) {
            try {
                // Revert product to normal
                product.promotionType = 'normal';
                product.price = product.originalPrice || product.price;
                product.discountPercent = null;
                product.dealStartDate = null;
                product.dealEndDate = null;
                product.dealQuantityLimit = null;
                product.dealQuantitySold = 0;
                product.originalPrice = null;

                await product.save();

                // Update associated promotion request
                if (product.promotionRequest) {
                    await PromotionRequest.findByIdAndUpdate(product.promotionRequest, {
                        status: 'expired'
                    });
                }

                console.log(`[Deal Expiration Job] Expired deal for product: ${product._id}`);
            } catch (error) {
                console.error(`[Deal Expiration Job] Error expiring product ${product._id}:`, error);
            }
        }

        console.log('[Deal Expiration Job] Completed successfully');
    } catch (error) {
        console.error('[Deal Expiration Job] Error:', error);
    }
}

/**
 * Initialize cron job for deal expiration
 * Runs every hour
 */
function initDealExpirationJob() {
    // Run every hour at minute 0
    // Format: minute hour day month weekday
    cron.schedule('0 * * * *', async () => {
        console.log('[Cron] Starting deal expiration check');
        await expireDeals();
    });

    console.log('✅ Deal expiration cron job initialized (runs every hour)');

    // Run immediately on startup
    console.log('[Startup] Running initial deal expiration check');
    expireDeals();
}

module.exports = {
    initDealExpirationJob,
    expireDeals // Export for manual trigger if needed
};
