/**
 * fix_return_stock.js
 * 
 * One-time script: Restores product stock for refunds where:
 *   - status = SELLER_RECEIVED_RETURN
 *   - receivedCondition = SELLABLE (or missing, defaults to SELLABLE intent)
 * 
 * Run: node fix_return_stock.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ Missing MONGODB_URI in .env");
  process.exit(1);
}

const {
  normalizeSelectedVariants,
  buildVariantKey,
  syncProductStockFromVariants,
} = require("./src/utils/productInventory");

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const RefundRequest = require("./src/models/RefundRequest");
  const Order        = require("./src/models/Order");
  const Product      = require("./src/models/Product");

  // Find all completed returns that should have restocked but didn't
  const refunds = await RefundRequest.find({
    status: "SELLER_RECEIVED_RETURN",
    receivedCondition: { $in: ["SELLABLE", "PENDING", null] },
  }).lean();

  console.log(`\n📦 Found ${refunds.length} refund(s) to check.\n`);

  let fixed = 0;

  for (const refund of refunds) {
    const order = await Order.findById(refund.order);
    if (!order) {
      console.warn(`  ⚠️  Order not found for refund ${refund._id}`);
      continue;
    }

    console.log(`\n🔄 Processing refund ${refund._id} | Order: ${order._id} (${order.status})`);

    if (!order.items || order.items.length === 0) {
      console.log("   No items in order, skipping.");
      continue;
    }

    for (const item of order.items) {
      if (!item.productId) continue;

      const incAmount = parseInt(item.quantity) || 1;
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`   ⚠️  Product not found: ${item.productId}`);
        continue;
      }

      const normalizedVariants = normalizeSelectedVariants(item.selectedVariants || []);
      const hasVariantCombos =
        Array.isArray(product.variantCombinations) &&
        product.variantCombinations.length > 0 &&
        normalizedVariants.length > 0;

      if (hasVariantCombos) {
        const key = buildVariantKey(normalizedVariants);
        const combo = product.variantCombinations.find((c) => c.key === key);
        if (combo) {
          const before = combo.quantity;
          combo.quantity = (Number(combo.quantity) || 0) + incAmount;
          syncProductStockFromVariants(product);
          console.log(`   ✅ Variant [${key}]: ${before} → ${combo.quantity} (product.stock now: ${product.stock})`);
        } else {
          const before = product.stock;
          product.quantity = (Number(product.quantity) || 0) + incAmount;
          product.stock    = (Number(product.stock)    || 0) + incAmount;
          console.log(`   ✅ (fallback) stock: ${before} → ${product.stock} for "${product.title}"`);
        }
      } else {
        const before = product.stock;
        product.quantity = (Number(product.quantity) || 0) + incAmount;
        product.stock    = (Number(product.stock)    || 0) + incAmount;
        console.log(`   ✅ Stock: ${before} → ${product.stock} for "${product.title}"`);
      }

      await product.save();
    }

    // Mark receivedCondition explicitly so we don't re-run on next script call
    await RefundRequest.findByIdAndUpdate(refund._id, { receivedCondition: "SELLABLE" });
    fixed++;
  }

  console.log(`\n🎉 Done! Fixed ${fixed}/${refunds.length} refund(s).\n`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Script failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
