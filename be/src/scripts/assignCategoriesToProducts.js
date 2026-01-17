require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product.js");
const Category = require("../models/Category.js");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const electronics = await Category.findOne({ slug: "electronics" });
    const homeGarden = await Category.findOne({ slug: "home-garden" });

    if (!electronics || !homeGarden) {
      throw new Error("Missing categories");
    }

    // 📱 Electronics
    await Product.updateMany(
      {
        title: {
          $regex: "iphone|watch|headphones|monitor|keyboard",
          $options: "i",
        },
      },
      {
        $set: { categories: [electronics._id] },
      },
    );

    // 🪑 Home & Garden
    await Product.updateMany(
      { title: { $regex: "chair", $options: "i" } },
      {
        $set: { categories: [homeGarden._id] },
      },
    );

    console.log("✅ Categories assigned to products");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
