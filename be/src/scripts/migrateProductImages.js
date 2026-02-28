// Script to migrate old imageUrl field to image field
// Run with: node src/scripts/migrateProductImages.js

const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function migrateProductImages() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ebay');
        console.log('Connected to MongoDB');

        // Find all products that have imageUrl but not image
        const products = await Product.find({}).lean();

        console.log(`Found ${products.length} products to check`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            // Skip if already has images array with data
            if (product.images && product.images.length > 0) {
                skippedCount++;
                continue;
            }

            // Check if product has imageUrl field (this shouldn't exist in model but might be in DB)
            if (product.imageUrl) {
                // Move imageUrl to images array
                await Product.updateOne(
                    { _id: product._id },
                    {
                        $set: {
                            image: product.imageUrl,
                            images: [product.imageUrl]
                        },
                        $unset: { imageUrl: 1 }
                    }
                );
                console.log(`Migrated product ${product._id}: ${product.title}`);
                migratedCount++;
            } else if (!product.image && !product.images) {
                // No image data at all - add placeholder
                skippedCount++;
            }
        }

        console.log(`\nMigration complete!`);
        console.log(`Migrated: ${migratedCount} products`);
        console.log(`Skipped: ${skippedCount} products (already have images or no imageUrl)`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateProductImages();
