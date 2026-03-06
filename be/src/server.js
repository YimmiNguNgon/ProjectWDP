// Import thư viện / packages
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const passport = require("passport");

// Load environment variables FIRST
dotenv.config();

// Import Files
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sellerRoutes = require('./routes/sellerRoutes');
const banAppealRoutes = require("./routes/banAppealRoutes");
const orderRoutes = require("./routes/orders");
const searchRoutes = require("./routes/search");
const addressRoutes = require("./routes/addressRoute");
const watchlistRoutes = require("./routes/watchlistRoute");
const cartRoutes = require("./routes/cartRoute");
const User = require("./models/User");

// Passport config (sau khi dotenv.config())
require("./config/passport");

const app = express();

// -----------------------------------------------------
// 🔓 CORS mở toàn bộ cho DEV (mọi origin, method, header)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
    credentials: true,
  }),
);
// -----------------------------------------------------

// Configure helmet to allow cross-origin resource loading
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Tắt CSP để tránh conflict với OAuth
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(morgan("dev"));

// Import routes
app.use("/api/auth", authRoutes);
app.use("/api/ban-appeals", banAppealRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/seller', sellerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/cart", cartRoutes);
const sellerApplicationRoutes = require("./routes/sellerApplicationRoutes");
app.use("/api/seller-applications", sellerApplicationRoutes);
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

// Saved searches and sellers routes
const savedSearchRoutes = require("./routes/savedSearchRoutes");
const savedSellerRoutes = require("./routes/savedSellerRoutes");
app.use("/api/saved-searches", savedSearchRoutes);
app.use("/api/saved-sellers", savedSellerRoutes);

// Chat routes
const chatRoutes = require("./routes/chats");
const chatHistoryRoutes = require("./routes/chatHistory");
app.use("/api/chats", chatRoutes);
app.use("/api/v1/chat-history", chatHistoryRoutes);

// Promotion routes
const promotionRoutes = require("./routes/promotions");
app.use("/api/promotions", promotionRoutes);

// Upload routes
const uploadRoutes = require("./routes/uploadRoutes");
app.use("/api/upload", uploadRoutes);

// Voucher routes
const voucherRoutes = require("./routes/vouchers");
app.use("/api/vouchers", voucherRoutes);

// Feedback Revision routes
const feedbackRevisionRoutes = require("./routes/feedbackRevision");
app.use("/api/feedback-revision", feedbackRevisionRoutes);

// Trust Score routes (Seller Trust Score & Tier-based Moderation)
const trustScoreRoutes = require("./routes/trustScore");
app.use("/api/trust-score", trustScoreRoutes);

// Verified Seller Badge routes
const verifiedBadgeRoutes = require("./routes/verifiedBadge");
app.use("/api/verified-badge", verifiedBadgeRoutes);

// Refund System routes
const refundRoutes = require("./routes/refundRoutes");
app.use("/api/refund", refundRoutes);

// health check
app.get("/health", (req, res) => res.json({ ok: true }));

// ⚠️ Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Backend Node.js is running!");
});

// Tạo tài khoản admin mặc định
async function createDefaultAdmin() {
  try {
    const existingAdmin = await User.findOne({ username: "admin" });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("admin", salt);

      const adminUser = new User({
        username: "admin",
        email: "admin@admin.com",
        passwordHash: passwordHash,
        role: "admin",
        isEmailVerified: true,
        status: "active",
      });

      await adminUser.save();
      console.log(
        "✅ Tài khoản admin mặc định đã được tạo (username: admin, password: admin)",
      );
    } else {
      console.log("ℹ️ Tài khoản admin đã tồn tại");
    }
  } catch (error) {
    console.error("❌ Lỗi khi tạo tài khoản admin mặc định:", error);
  }
}

async function createDefaultSeller() {
  try {
    const existingSeller = await User.findOne({ username: "seller" });

    if (!existingSeller) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("seller", salt);

      const sellerUser = new User({
        username: "seller",
        email: "seller@seller.com",
        passwordHash: passwordHash,
        role: "seller",
        isEmailVerified: true,
        status: "active",
      });

      await sellerUser.save();
      console.log(
        "✅ Tài khoản seller mặc định đã được tạo (username: seller, password: seller)",
      );
    } else {
      console.log("ℹ️ Tài khoản seller đã tồn tại");
    }
  } catch (error) {
    console.error("❌ Lỗi khi tạo tài khoản seller mặc định:", error);
  }
}

async function ensureCartItemVariantIndex() {
  const CartItem = require("./models/CartItem");
  const {
    buildVariantKey,
    normalizeSelectedVariants,
  } = require("./utils/productInventory");

  const legacyItems = await CartItem.find({
    $or: [{ variantKey: { $exists: false } }, { variantKey: "" }],
    "selectedVariants.0": { $exists: true },
  })
    .select("_id selectedVariants")
    .lean();

  if (legacyItems.length > 0) {
    const updates = legacyItems
      .map((item) => {
        const normalized = normalizeSelectedVariants(item.selectedVariants || []);
        const key = buildVariantKey(normalized);
        if (!key) return null;
        return {
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { selectedVariants: normalized, variantKey: key } },
          },
        };
      })
      .filter(Boolean);

    if (updates.length > 0) {
      await CartItem.bulkWrite(updates, { ordered: false });
      console.log(
        `Updated ${updates.length} legacy cart item(s) with missing variant key`,
      );
    }
  }

  const indexes = await CartItem.collection.indexes();
  const legacyUniqueIndex = indexes.find(
    (idx) =>
      idx.unique === true &&
      idx.key &&
      idx.key.cart === 1 &&
      idx.key.product === 1 &&
      idx.key.variantKey === undefined,
  );

  if (legacyUniqueIndex) {
    await CartItem.collection.dropIndex(legacyUniqueIndex.name);
    console.log(`Dropped legacy cart index "${legacyUniqueIndex.name}"`);
  }

  const variantIndex = indexes.find(
    (idx) =>
      idx.key &&
      idx.key.cart === 1 &&
      idx.key.product === 1 &&
      idx.key.variantKey === 1,
  );

  if (variantIndex && variantIndex.unique !== true) {
    await CartItem.collection.dropIndex(variantIndex.name);
  }

  if (!variantIndex || variantIndex.unique !== true) {
    await CartItem.collection.createIndex(
      { cart: 1, product: 1, variantKey: 1 },
      { unique: true, name: "cart_1_product_1_variantKey_1" },
    );
  }
}

async function start() {
  await connectDB(process.env.MONGO_URI);
  await ensureCartItemVariantIndex();
  await createDefaultAdmin();
  await createDefaultSeller();

  // Initialize deal expiration cron job
  const { initDealExpirationJob } = require("./jobs/dealExpirationJob");
  initDealExpirationJob();

  // Initialize seller stage cron job
  const { initSellerStageJob } = require("./jobs/sellerStageJob");
  initSellerStageJob();

  // Initialize verified seller badge cron job
  const { initVerifiedBadgeJob } = require("./jobs/verifiedBadgeJob");
  initVerifiedBadgeJob();

  // Initialize refund auto-approve cron job
  const { initRefundJob } = require("./jobs/refundJob");
  initRefundJob();

  // Create HTTP server from Express app
  const http = require("http");
  const server = http.createServer(app);

  // Setup Socket.IO
  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins in dev
      methods: ["GET", "POST"],
    },
  });

  // Initialize Socket.IO handlers
  const initSocket = require("./socket");
  initSocket(io);

  // Pass io to notificationService
  const notificationService = require("./services/notificationService");
  notificationService.setIO(io);

  server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`✅ Socket.IO is ready for real-time messaging`);
  });
}
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
