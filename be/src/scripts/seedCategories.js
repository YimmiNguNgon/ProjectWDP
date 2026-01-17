require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category.js");

const categories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home & Garden", slug: "home-garden" },
  { name: "Sports", slug: "sports" },
  { name: "Books", slug: "books" },
  { name: "Toys & Games", slug: "toys-games" },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const cat of categories) {
      await Category.updateOne(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true },
      );
    }

    console.log("✅ Categories seeded");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
