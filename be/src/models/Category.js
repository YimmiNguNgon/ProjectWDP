const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    imageUrl: { type: String, default: "" },
    isHighRisk: { type: Boolean, default: false }, // PROBATION sellers không được đăng
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", categorySchema);
