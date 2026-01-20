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
const orderRoutes = require("./routes/orders");
const searchRoutes = require("./routes/search");
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
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/search", searchRoutes);

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

async function start() {
  await connectDB(process.env.MONGO_URI);
  await createDefaultAdmin();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
