/**
 * fix-savedSellers.js
 * Migration script: sửa các user document có savedSellers không phải array
 * Chạy 1 lần: node fix-savedSellers.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Tìm tất cả users có savedSellers không phải array
    const result = await mongoose.connection.db.collection("users").find({
        $where: "!Array.isArray(this.savedSellers)"
    }).toArray();

    console.log(`Found ${result.length} users with corrupted savedSellers`);

    for (const user of result) {
        const raw = user.savedSellers;
        let fixed = [];

        if (typeof raw === "string" && raw.trim() !== "") {
            // String dạng ObjectId → wrap thành array
            try {
                fixed = [new mongoose.Types.ObjectId(raw.trim())];
                console.log(`Fixing user ${user._id}: string "${raw}" → array`);
            } catch {
                console.log(`Fixing user ${user._id}: invalid string "${raw}" → []`);
                fixed = [];
            }
        } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            // Object → convert
            console.log(`Fixing user ${user._id}: object → []`);
            fixed = [];
        } else {
            // null / undefined → []
            console.log(`Fixing user ${user._id}: null/undefined → []`);
            fixed = [];
        }

        await mongoose.connection.db.collection("users").updateOne(
            { _id: user._id },
            { $set: { savedSellers: fixed } }
        );
    }

    console.log("✅ Migration complete");
    await mongoose.disconnect();
}

fix().catch(console.error);
