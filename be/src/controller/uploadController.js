const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Configure multer to use memory storage (file buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});


/**
 * Upload avatar to Cloudinary
 * @route POST /api/upload/avatar
 * @access Private
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary using buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Pipe the buffer to cloudinary
      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({
      message: 'Avatar uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      message: 'Failed to upload avatar',
      error: error.message,
    });
  }
};

/**
 * Upload product images to Cloudinary
 * @route POST /api/upload/product-images
 * @access Private (Admin/Seller)
 */
const uploadProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'products',
            transformation: [
              { width: 1000, height: 1000, crop: 'limit' },
              { quality: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map((result) => result.secure_url);

    res.status(200).json({
      message: 'Product images uploaded successfully',
      urls: urls,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      message: 'Failed to upload product images',
      error: error.message,
    });
  }
};

/**
 * Upload chat file to Cloudinary
 * @route POST /api/upload/chat-file
 * @access Private
 */
const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary using buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'chat-files',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Pipe the buffer to cloudinary
      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({
      message: 'Chat file uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      message: 'Failed to upload chat file',
      error: error.message,
    });
  }
};

/**
 * Upload dispute proof images to Cloudinary (shipper uploads evidence)
 * @route POST /api/upload/dispute-images
 * @access Private (Shipper)
 */
const uploadDisputeImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "dispute-evidence",
            transformation: [
              { width: 1200, height: 1200, crop: "limit" },
              { quality: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map((r) => r.secure_url);

    res.status(200).json({ message: "Images uploaded successfully", urls });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ message: "Failed to upload images", error: error.message });
  }
};

/**
 * Upload report evidence image to Cloudinary (buyer uploads proof)
 * @route POST /api/upload/report-evidence
 * @access Private (Buyer)
 */
const uploadReportEvidence = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "report-evidence",
          transformation: [
            { width: 1600, height: 1600, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({
      message: "Evidence uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ message: "Failed to upload evidence", error: error.message });
  }
};

module.exports = {
  upload,
  uploadAvatar,
  uploadProductImages,
  uploadChatFile,
  uploadDisputeImages,
  uploadReportEvidence,
};
