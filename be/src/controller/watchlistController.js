const Watchlist = require("../models/Watchlist.js");
const Product = require("../models/Product.js");

exports.toggleWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    let record = await Watchlist.findOne({
      user: userId,
      product: productId,
    });

    if (!record) {
      await Watchlist.create({
        user: userId,
        product: productId,
        isActive: true,
      });

      await Product.findByIdAndUpdate(productId, {
        $inc: { watchCount: 1 },
      });

      return res.json({ watched: true });
    }

    if (record.isActive) {
      record.isActive = false;
      await record.save();

      const product = await Product.findById(productId);
      if (product && product.watchCount > 0) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { watchCount: -1 },
        });
      } else {
        await Product.findByIdAndUpdate(productId, {
          $set: { watchCount: 0 },
        });
      }

      return res.json({ watched: false });
    } else {
      record.isActive = true;
      await record.save();

      await Product.findByIdAndUpdate(productId, {
        $inc: { watchCount: 1 },
      });

      return res.json({ watched: true });
    }
  } catch (error) {
    next(error);
  }
};

exports.getUserWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const list = await Watchlist.find({
      user: userId,
      isActive: true,
    }).populate("product");

    return res
      .status(200)
      .json({ message: "Get User Watchlist Successfully", data: list });
  } catch (error) {
    next(error);
  }
};

exports.getWatchCount = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId).select("watchCount");

    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json(product.watchCount);
  } catch (error) {
    next(error);
  }
};
