const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getAllCategories = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const search = String(req.query.search || "").trim();

    const filter = {};
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { slug: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategoryDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await Category.findById(id).lean();
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    const slug = normalizeSlug(req.body.slug || name);
    const imageUrl = String(req.body.imageUrl || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!slug) {
      return res.status(400).json({ message: "Category slug is required" });
    }

    const duplicateBySlug = await Category.findOne({ slug }).lean();
    if (duplicateBySlug) {
      return res.status(409).json({ message: "Category slug already exists" });
    }

    const duplicateByName = await Category.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    }).lean();
    if (duplicateByName) {
      return res.status(409).json({ message: "Category name already exists" });
    }

    const created = await Category.create({
      name,
      slug,
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const nextName =
      req.body.name !== undefined ? normalizeName(req.body.name) : undefined;
    const nextSlug =
      req.body.slug !== undefined ? normalizeSlug(req.body.slug) : undefined;
    const nextImageUrl =
      req.body.imageUrl !== undefined
        ? String(req.body.imageUrl || "").trim()
        : undefined;

    if (
      nextName === undefined &&
      nextSlug === undefined &&
      nextImageUrl === undefined
    ) {
      return res.status(400).json({ message: "No fields to update" });
    }

    if (nextName !== undefined && !nextName) {
      return res.status(400).json({ message: "Category name cannot be empty" });
    }

    if (nextSlug !== undefined && !nextSlug) {
      return res.status(400).json({ message: "Category slug cannot be empty" });
    }

    if (nextName !== undefined) {
      const duplicateByName = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(nextName)}$`, $options: "i" },
      }).lean();
      if (duplicateByName) {
        return res.status(409).json({ message: "Category name already exists" });
      }
      category.name = nextName;
    }

    if (nextSlug !== undefined) {
      const duplicateBySlug = await Category.findOne({
        _id: { $ne: id },
        slug: nextSlug,
      }).lean();
      if (duplicateBySlug) {
        return res.status(409).json({ message: "Category slug already exists" });
      }
      category.slug = nextSlug;
    }

    if (nextImageUrl !== undefined) {
      category.imageUrl = nextImageUrl;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const usedByProducts = await Product.countDocuments({ categoryId: id });
    if (usedByProducts > 0) {
      return res.status(409).json({
        message: `Cannot delete category because ${usedByProducts} product(s) still use it`,
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
