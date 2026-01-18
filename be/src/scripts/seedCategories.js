require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category.js");

const categories = [
  {
    name: "Electronics",
    slug: "electronics",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475",
  },
  {
    name: "Fashion",
    slug: "fashion",
    imageUrl: "https://images.unsplash.com/photo-1521335629791-ce4aec67dd47",
  },
  {
    name: "Home & Garden",
    slug: "home-garden",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7",
  },
  {
    name: "Sports",
    slug: "sports",
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b",
  },
  {
    name: "Books",
    slug: "books",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794",
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    imageUrl: "https://images.unsplash.com/photo-1607082349566-1870b5d1b6b3",
  },
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

    console.log("✅ Categories seeded with images");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
