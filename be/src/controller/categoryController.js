const Category = require("../models/Category");

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    return res.json({ data: categories });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "name and slug are required" });
    }

    const category = new Category({ name, slug });
    await category.save();
    return res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
};
