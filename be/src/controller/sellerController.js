const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');

class SellerController {
  /**
   * Lấy danh sách sản phẩm của seller
   * @route GET /api/seller/:sellerId/products
   */
  async getSellerProducts(req, res) {
    try {
      const { sellerId } = req.params;
      const { 
        page = 1, 
        limit = 12, 
        sort = 'newest',
        search = '',
        categoryId = '',
        status = 'available',
        listingStatus = 'active'
      } = req.query;

      // Xây dựng query
      const query = {
        sellerId: sellerId,
        status: status,
        listingStatus: listingStatus
      };

      // Thêm search nếu có
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }

      // Thêm category filter nếu có
      if (categoryId && categoryId !== 'all' && categoryId !== 'undefined') {
        query.categoryId = categoryId;
      }

      // Xác định sort
      let sortOption = {};
      switch (sort) {
        case 'price_asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
          sortOption = { price: -1 };
          break;
        case 'popular':
          sortOption = { dealQuantitySold: -1, watchCount: -1 };
          break;
        case 'rating':
          sortOption = { averageRating: -1, ratingCount: -1 };
          break;
        case 'newest':
        default:
          sortOption = { createdAt: -1 };
      }

      // Tính skip cho phân trang
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Lấy tổng số sản phẩm
      const total = await Product.countDocuments(query);

      // Lấy sản phẩm với population
      const products = await Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categoryId', 'name slug')
        .lean();

      // Tính total pages
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: products,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      });

    } catch (error) {
      console.error('Error in getSellerProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching seller products',
        error: error.message
      });
    }
  }

  /**
   * Lấy chi tiết 1 sản phẩm của seller
   * @route GET /api/seller/:sellerId/products/:productId
   */
  async getSellerProductDetail(req, res) {
    try {
      const { sellerId, productId } = req.params;

      const product = await Product.findOne({
        _id: productId,
        sellerId: sellerId
      }).populate('categoryId', 'name slug');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      console.error('Error in getSellerProductDetail:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product details',
        error: error.message
      });
    }
  }

  /**
   * Lấy thống kê của seller
   * @route GET /api/seller/:sellerId/stats
   */
  async getSellerStats(req, res) {
    try {
      const { sellerId } = req.params;

      const stats = await Product.aggregate([
        { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { 
            $sum: { 
              $cond: [{ $eq: ['$listingStatus', 'active'] }, 1, 0] 
            }
          },
          totalSold: { $sum: '$dealQuantitySold' },
          averageRating: { $avg: '$averageRating' },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }}
      ]);

      res.json({
        success: true,
        data: stats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          totalSold: 0,
          averageRating: 0,
          totalValue: 0
        }
      });

    } catch (error) {
      console.error('Error in getSellerStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching seller stats',
        error: error.message
      });
    }
  }
  /**
   * Lấy thống kê sản phẩm của seller
   * @route GET /api/seller/:sellerId/products/stats
   */
  async getSellerProductStats(req, res) {
    try {
      const { sellerId } = req.params;
      const sellerObjId = new mongoose.Types.ObjectId(sellerId);

      const stats = await Product.aggregate([
        { $match: { sellerId: sellerObjId, listingStatus: { $ne: 'deleted' } } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$listingStatus', 'active'] }, 1, 0] },
            },
            averageRating: { $avg: '$averageRating' },
          },
        },
      ]);

      res.json({
        success: true,
        data: stats[0] || { totalProducts: 0, activeProducts: 0, averageRating: 0 },
      });
    } catch (error) {
      console.error('Error in getSellerProductStats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Lấy public profile của seller (description, shopName)
   * @route GET /api/seller/:sellerId/profile
   */
  async getSellerPublicProfile(req, res) {
    try {
      const { sellerId } = req.params;
      const user = await User.findById(sellerId).select('username role sellerInfo.shopName sellerInfo.productDescription sellerInfo.registeredAt');
      if (!user || user.role !== 'seller') {
        return res.status(404).json({ success: false, message: 'Seller not found' });
      }
      res.json({
        success: true,
        data: {
          description: user.sellerInfo?.productDescription || '',
          shopName: user.sellerInfo?.shopName || user.username,
        }
      });
    } catch (error) {
      console.error('Error in getSellerPublicProfile:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SellerController();