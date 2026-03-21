/**
 * Seed Script — xóa toàn bộ collections và insert dữ liệu mẫu
 * Chạy: cd be && node src/scripts/seed.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Models
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const OrderGroup = require("../models/OrderGroup");
const Review = require("../models/Review");
const Voucher = require("../models/Voucher");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const Address = require("../models/Address");
const SellerApplication = require("../models/SellerApplication");
const SellerTrustScore = require("../models/SellerTrustScore");
const VerifiedBadge = require("../models/VerifiedBadge");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const BuyerReportStats = require("../models/BuyerReportStats");
const Report = require("../models/Report");
const RefundRequest = require("../models/RefundRequest");
const DeliveryDispute = require("../models/DeliveryDispute");
const SellerRiskHistory = require("../models/SellerRiskHistory");
const Revenue = require("../models/Revenue");

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function dropCollections(db) {
  const collections = [
    "users", "categories", "products", "orders", "ordergroups",
    "reviews", "vouchers", "voucherrequests", "complaints", "notifications",
    "addresses", "carts", "cartitems", "sessions", "sellertrustscores",
    "verifiedbadges", "sellerapplications", "sellerriskhistories",
    "refundrequests", "reports", "conversations", "messages", "auditlogs",
    "userviolations", "promotionrequests", "recentlyvieweds", "savedsearches",
    "watchlists", "revenues", "banapeals", "buyerreportstats",
    "deliverydisputes", "feedbackrevisionrequests", "messagedebuglogss",
  ];
  for (const col of collections) {
    try {
      await db.dropCollection(col);
      console.log(`  Dropped: ${col}`);
    } catch (_) {
      // collection không tồn tại → bỏ qua
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB:", process.env.MONGO_URI);

  const db = mongoose.connection.db;

  console.log("\n⬇  Dropping all collections…");
  await dropCollections(db);

  // ── 1. USERS ───────────────────────────────────────────────────────────────
  console.log("\n👤 Seeding users…");

  const adminHash     = await hashPassword("admin");
  const password123   = await hashPassword("password123");

  const adminUser = await User.create({
    username: "admin",
    email: "admin@admin.com",
    passwordHash: adminHash,
    role: "admin",
    isEmailVerified: true,
    status: "active",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
  });

  const techSeller = await User.create({
    username: "techstore_vn",
    email: "techstore@wdp.com",
    passwordHash: password123,
    role: "seller",
    isEmailVerified: true,
    status: "active",
    sellerStage: "NORMAL",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=techstore",
    sellerInfo: {
      shopName: "TechStore VN",
      productDescription: "Genuine electronics accessories, fast nationwide delivery.",
      registeredAt: daysAgo(180),
      successOrders: 3,
      avgRating: 4.7,
      refundRate: 0.012,
      reportRate: 0.5,
      isVerifiedSeller: true,
    },
  });

  const sportSeller = await User.create({
    username: "sportzone_hcm",
    email: "sportzone@wdp.com",
    passwordHash: password123,
    role: "seller",
    isEmailVerified: true,
    status: "active",
    sellerStage: "NORMAL",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sportzone",
    sellerInfo: {
      shopName: "SportZone HCM",
      productDescription: "High-quality sports gear at the best prices. Authentic products guaranteed.",
      registeredAt: daysAgo(90),
      successOrders: 3,
      avgRating: 4.5,
      refundRate: 0.020,
      reportRate: 0.8,
      isVerifiedSeller: false,
    },
  });

  const buyer1 = await User.create({
    username: "john_smith",
    email: "buyer1@wdp.com",
    passwordHash: password123,
    role: "buyer",
    isEmailVerified: true,
    status: "active",
    reputationScore: 12,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=buyer1",
  });
  const buyer2 = await User.create({
    username: "emily_jones",
    email: "buyer2@wdp.com",
    passwordHash: password123,
    role: "buyer",
    isEmailVerified: true,
    status: "active",
    reputationScore: 8,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=buyer2",
  });
  const buyer3 = await User.create({
    username: "michael_brown",
    email: "buyer3@wdp.com",
    passwordHash: password123,
    role: "buyer",
    isEmailVerified: true,
    status: "active",
    reputationScore: 5,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=buyer3",
  });
  const buyer4 = await User.create({
    username: "sarah_davis",
    email: "buyer4@wdp.com",
    passwordHash: password123,
    role: "buyer",
    isEmailVerified: true,
    status: "active",
    reputationScore: 3,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=buyer4",
  });
  const buyer5 = await User.create({
    username: "chris_wilson",
    email: "buyer5@wdp.com",
    passwordHash: password123,
    role: "buyer",
    isEmailVerified: true,
    status: "active",
    reputationScore: 1,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=buyer5",
  });

  const shipper1 = await User.create({
    username: "shipper_mike",
    email: "shipper1@wdp.com",
    passwordHash: password123,
    role: "shipper",
    isEmailVerified: true,
    status: "active",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=shipper1",
    shipperInfo: { maxOrders: 5, isAvailable: true },
  });
  const shipper2 = await User.create({
    username: "shipper_jake",
    email: "shipper2@wdp.com",
    passwordHash: password123,
    role: "shipper",
    isEmailVerified: true,
    status: "active",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=shipper2",
    shipperInfo: { maxOrders: 3, isAvailable: true },
  });

  console.log("  Created 10 users");

  // ── 2. CATEGORIES ──────────────────────────────────────────────────────────
  console.log("\n📂 Seeding categories…");

  const catDefs = [
    { name: "Electronics",         slug: "electronics",      imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400" },
    { name: "Clothing & Apparel",   slug: "clothing-apparel", imageUrl: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400" },
    { name: "Sports & Outdoors",    slug: "sports-outdoors",  imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400" },
    { name: "Home & Garden",        slug: "home-garden",      imageUrl: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=400" },
    { name: "Books & Media",        slug: "books-media",      imageUrl: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400" },
    { name: "Toys & Games",         slug: "toys-games",       imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400" },
  ];
  const cats = await Category.insertMany(catDefs);
  const catBySlug = {};
  cats.forEach((c) => { catBySlug[c.slug] = c._id; });
  console.log("  Created 6 categories");

  // ── 3. PRODUCTS ────────────────────────────────────────────────────────────
  console.log("\n📦 Seeding products…");

  // Prices in USD ($10–$500). Shipping $5.99–$9.99.
  // ratingCount & averageRating khớp với reviews được seed bên dưới:
  //   techProducts[0] = headphones  → 1 review (5★)
  //   techProducts[3] = keyboard    → 1 review (4★)
  //   sportProducts[0] = shoes      → 1 review (4★)
  //   sportProducts[2] = yoga mat   → 1 review (5★)
  const techProducts = await Product.insertMany([
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "Wireless Bluetooth Headphones Pro X",
      description: "Active noise-cancelling wireless headphones with 30-hour battery life and Hi-Fi sound. Dual-device multipoint connection.",
      price: 79.99, stock: 44, quantity: 44, condition: "New", listingStatus: "active",
      averageRating: 5.0, ratingCount: 1,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"],
      variants: [{ name: "Color", options: [{ value: "Black", price: 79.99, quantity: 24 }, { value: "White", price: 79.99, quantity: 20 }] }],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "7-in-1 USB-C Hub Aluminum",
      description: "7-port USB-C hub: 4K HDMI, 3x USB-A, SD/MicroSD card reader, 100W PD charging. Aluminum heat-dissipation body.",
      price: 29.99, stock: 78, quantity: 78, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600",
      images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "RGB Gaming Mouse 12000 DPI",
      description: "Gaming mouse with 16.8M RGB lighting, 100-12000 DPI, 7 programmable buttons, high-precision optical sensor.",
      price: 42.99, stock: 60, quantity: 60, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600",
      images: ["https://images.unsplash.com/photo-1527814050087-3793815479db?w=600"],
      variants: [{ name: "Color", options: [{ value: "Black", price: 42.99, quantity: 40 }, { value: "Red", price: 42.99, quantity: 20 }] }],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "Mechanical Keyboard TKL Blue Switch",
      description: "87-key TKL mechanical keyboard with Blue clicky switches, per-key RGB backlight, and CNC aluminum build.",
      price: 89.99, stock: 24, quantity: 24, condition: "New", listingStatus: "active",
      averageRating: 4.0, ratingCount: 1,
      image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600",
      images: ["https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "HD Webcam 1080p 60fps",
      description: "Full HD 1080p/60fps webcam with autofocus and dual noise-cancelling microphone. Compatible with Zoom, Teams, Google Meet.",
      price: 49.99, stock: 35, quantity: 35, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600",
      images: ["https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "Portable SSD 1TB USB 3.2",
      description: "1TB portable SSD with 1050MB/s read speed. Compact, shock-resistant, compatible with PC, Mac, and Android.",
      price: 109.99, stock: 19, quantity: 19, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600",
      images: ["https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "Power Bank 20000mAh PD 65W",
      description: "20000mAh power bank with 65W PD fast charging, 3 output ports (2x USB-A + 1x USB-C), LED battery percentage display.",
      price: 59.99, stock: 54, quantity: 54, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600",
      images: ["https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["home-garden"],
      title: "Smart Touch LED Desk Lamp",
      description: "LED desk lamp with 3 color modes (warm/neutral/cool), 10 brightness levels, USB-C power input, and USB-A charging port.",
      price: 24.99, stock: 70, quantity: 70, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=600",
      images: ["https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "Silicone Watch Band for Apple Watch 45mm",
      description: "Soft silicone sport band compatible with Apple Watch 45mm. Sweat-resistant, available in multiple colors.",
      price: 11.99, stock: 200, quantity: 200, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600",
      images: ["https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600"],
      variants: [{ name: "Color", options: [{ value: "Black", price: 11.99, quantity: 60 }, { value: "Blue", price: 11.99, quantity: 50 }, { value: "Pink", price: 11.99, quantity: 50 }, { value: "Green", price: 11.99, quantity: 40 }] }],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "HDMI 2.1 Cable 8K 2m",
      description: "HDMI 2.1 cable supporting 8K@60Hz / 4K@120Hz, HDR, VRR. 2-meter length, anti-oxidation metal connectors.",
      price: 13.99, stock: 150, quantity: 150, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "Adjustable Aluminum Laptop Stand",
      description: "Solid aluminum laptop stand with 6 adjustable angles (15-50°), compatible with 10-16 inch laptops. Foldable and portable.",
      price: 21.99, stock: 90, quantity: 90, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600",
      images: ["https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "XL Gaming Mouse Pad 80x30cm",
      description: "Extra-large gaming desk pad 80x30cm with high-speed woven surface, stitched edges, and non-slip rubber base.",
      price: 12.99, stock: 120, quantity: 120, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1593640408182-31c228dacb46?w=600",
      images: ["https://images.unsplash.com/photo-1593640408182-31c228dacb46?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "USB Condenser Microphone Studio Kit",
      description: "USB cardioid condenser microphone for streaming and podcasts, 20Hz-20kHz frequency, includes desk mount and pop filter.",
      price: 65.99, stock: 18, quantity: 18, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1520170350707-b2da59970118?w=600",
      images: ["https://images.unsplash.com/photo-1520170350707-b2da59970118?w=600"],
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "iPhone 15 Pro Clear MagSafe Case",
      description: "Transparent MagSafe-compatible case, anti-yellowing TPU material, 1.5mm raised camera protection.",
      price: 10.99, stock: 300, quantity: 300, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600",
      images: ["https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600"],
      promotionType: "outlet",
      originalPrice: 15.99,
      discountPercent: 31,
    },
    {
      sellerId: techSeller._id,
      categoryId: catBySlug["electronics"],
      title: "iPhone 15 Tempered Glass Screen Protector 9H (2-Pack)",
      description: "9H hardness tempered glass, 99.9% clarity, anti-fingerprint coating. Pack of 2 with alignment frame.",
      price: 9.99, stock: 500, quantity: 500, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600",
      images: ["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600"],
    },
  ]);

  // sportProducts[0] = running shoes → 1 review (4★)
  // sportProducts[2] = yoga mat     → 1 review (5★)
  // sportProducts[3] = water bottle → delivered (chưa review)
  // sportProducts[4] = cap          → cancelled
  // sportProducts[5] = gym gloves   → returned
  const sportProducts = await Product.insertMany([
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "Running Shoes Pro 2024",
      description: "Lightweight EVA sole running shoes with Air cushion, breathable mesh upper. Suitable for road running and treadmill.",
      price: 75.99, stock: 59, quantity: 59, condition: "New", listingStatus: "active",
      averageRating: 4.0, ratingCount: 1,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
      images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"],
      variants: [{ name: "Size", options: [{ value: "39", price: 75.99, quantity: 10 }, { value: "40", price: 75.99, quantity: 15 }, { value: "41", price: 75.99, quantity: 15 }, { value: "42", price: 75.99, quantity: 9 }, { value: "43", price: 75.99, quantity: 10 }] }],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["clothing-apparel"],
      title: "Men's Dry-Fit Athletic T-Shirt",
      description: "Quick-dry Dry-Fit polo shirt with 4-way stretch. Suitable for gym, running, and yoga.",
      price: 18.99, stock: 150, quantity: 150, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
      images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600"],
      variants: [
        { name: "Size", options: [{ value: "S", price: 18.99, quantity: 30 }, { value: "M", price: 18.99, quantity: 50 }, { value: "L", price: 18.99, quantity: 40 }, { value: "XL", price: 18.99, quantity: 30 }] },
        { name: "Color", options: [{ value: "Black", price: 18.99, quantity: 75 }, { value: "Navy", price: 18.99, quantity: 75 }] },
      ],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "Non-Slip TPE Yoga Mat 6mm",
      description: "Dual-layer 6mm TPE yoga mat with double-sided anti-slip surface, odorless, easy to clean. Includes carry strap and mesh bag.",
      price: 29.99, stock: 84, quantity: 84, condition: "New", listingStatus: "active",
      averageRating: 5.0, ratingCount: 1,
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600",
      images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600"],
      variants: [{ name: "Color", options: [{ value: "Purple", price: 29.99, quantity: 29 }, { value: "Blue", price: 29.99, quantity: 30 }, { value: "Pink", price: 29.99, quantity: 25 }] }],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "Stainless Steel Sports Water Bottle 1L",
      description: "1-liter insulated stainless steel bottle, keeps cold 24h / hot 12h, one-touch lid, BPA-free.",
      price: 22.99, stock: 108, quantity: 108, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600",
      images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"],
      variants: [{ name: "Color", options: [{ value: "Silver", price: 22.99, quantity: 40 }, { value: "Black", price: 22.99, quantity: 38 }, { value: "Blue", price: 22.99, quantity: 30 }] }],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["clothing-apparel"],
      title: "Adjustable Sports Baseball Cap",
      description: "Unisex cotton sports cap with Velcro adjustable strap and embroidered logo. Lightweight and breathable.",
      price: 11.99, stock: 200, quantity: 200, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600",
      images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600"],
      variants: [{ name: "Color", options: [{ value: "Black", price: 11.99, quantity: 80 }, { value: "White", price: 11.99, quantity: 60 }, { value: "Red", price: 11.99, quantity: 60 }] }],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "Gel Open-Finger Gym Gloves",
      description: "Neoprene gym gloves with gel palm padding, wrist support strap, and anti-slip grip.",
      price: 13.99, stock: 95, quantity: 95, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600",
      images: ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600"],
      variants: [{ name: "Size", options: [{ value: "S/M", price: 13.99, quantity: 50 }, { value: "L/XL", price: 13.99, quantity: 45 }] }],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "High-Speed Jump Rope with Bearings",
      description: "Speed jump rope with 360° ball bearings, anti-slip plastic handles, PVC-coated steel cable, adjustable length.",
      price: 10.99, stock: 180, quantity: 180, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
      images: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600"],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "Resistance Bands Set 5 Levels",
      description: "Set of 5 latex resistance bands (10-50 lb), color-coded by difficulty level. Includes mesh carry bag and exercise guide.",
      price: 17.99, stock: 130, quantity: 130, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600",
      images: ["https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600"],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["clothing-apparel"],
      title: "Men's 7-Inch Compression Shorts",
      description: "4D spandex stretch compression shorts with zippered side pocket and muscle support technology.",
      price: 21.99, stock: 75, quantity: 75, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600",
      images: ["https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600"],
      variants: [{ name: "Size", options: [{ value: "S", price: 21.99, quantity: 15 }, { value: "M", price: 21.99, quantity: 25 }, { value: "L", price: 21.99, quantity: 20 }, { value: "XL", price: 21.99, quantity: 15 }] }],
    },
    {
      sellerId: sportSeller._id,
      categoryId: catBySlug["sports-outdoors"],
      title: "Waterproof Hiking Backpack 30L",
      description: "30L nylon waterproof backpack with padded 15.6\" laptop compartment, separate shoe pocket, and ergonomic back frame.",
      price: 45.99, stock: 55, quantity: 55, condition: "New", listingStatus: "active",
      averageRating: 0, ratingCount: 0,
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
      images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"],
      promotionType: "daily_deal",
      originalPrice: 59.99,
      discountPercent: 23,
      dealStartDate: daysAgo(3),
      dealEndDate: daysFromNow(7),
    },
  ]);

  const allProducts = [...techProducts, ...sportProducts];
  console.log(`  Created ${allProducts.length} products`);

  // ── 4. SELLER APPLICATIONS ─────────────────────────────────────────────────
  console.log("\n📋 Seeding seller applications…");
  await SellerApplication.insertMany([
    {
      user: techSeller._id,
      shopName: "TechStore VN",
      productDescription: "Genuine electronics accessories, fast nationwide delivery.",
      status: "approved",
      reviewedBy: adminUser._id,
      reviewedAt: daysAgo(170),
    },
    {
      user: sportSeller._id,
      shopName: "SportZone HCM",
      productDescription: "High-quality sports gear at the best prices. Authentic products guaranteed.",
      status: "approved",
      reviewedBy: adminUser._id,
      reviewedAt: daysAgo(85),
    },
  ]);
  console.log("  Created 2 seller applications");

  // ── 5. SELLER TRUST SCORES ─────────────────────────────────────────────────
  console.log("\n⭐ Seeding seller trust scores…");
  // Sub-scores: 0-5 scale | Rates: 0-1 decimal | finalScore: 0-5 (capped)
  // techStore: 12 months old → stabilityScore = 12/24*5 = 2.50
  // finalScore = 0.4*4.75 + 0.2*4.90 + 0.1*4.60 + 0.15*5.00 + 0.15*2.50 = 4.47
  await SellerTrustScore.insertMany([
    {
      seller: techSeller._id,
      ratingScore: 4.75, reviewCount: 142, avgRating: 4.7,
      completionRateScore: 4.90, responseRateScore: 4.60, disputeScore: 5.00,
      stabilityScore: 2.50, completionRate: 0.985, responseRate: 0.923,
      disputeRate: 0.012, accountAgeMonths: 12, totalDelivered: 3,
      finalScore: 4.47, orders30Days: 24, refunds30Days: 1, refundRate: 0.042,
      riskFlagged: false, tier: "TRUSTED", productModerationMode: "AUTO_APPROVED",
      lastCalculatedAt: daysAgo(1),
    },
    // sportZone: 9 months old → stabilityScore = 9/24*5 = 1.875
    // finalScore = 0.4*4.30 + 0.2*4.55 + 0.1*4.25 + 0.15*4.90 + 0.15*1.875 = 4.07
    {
      seller: sportSeller._id,
      ratingScore: 4.30, reviewCount: 87, avgRating: 4.5,
      completionRateScore: 4.55, responseRateScore: 4.25, disputeScore: 4.90,
      stabilityScore: 1.875, completionRate: 0.910, responseRate: 0.850,
      disputeRate: 0.020, accountAgeMonths: 9, totalDelivered: 3,
      finalScore: 4.07, orders30Days: 18, refunds30Days: 2, refundRate: 0.111,
      riskFlagged: false, tier: "TRUSTED", productModerationMode: "AUTO_APPROVED",
      lastCalculatedAt: daysAgo(1),
    },
  ]);
  console.log("  Created 2 seller trust scores");

  // ── 6. VERIFIED BADGES ─────────────────────────────────────────────────────
  console.log("\n✅ Seeding verified badges…");
  await VerifiedBadge.insertMany([
    {
      seller: techSeller._id,
      isVerified: true,
      ordersLast30Days: 24,
      completionRate: 0.985,
      trustScore: 4.47,
      accountAgeMonths: 12,
      verifiedAt: daysAgo(30),
      lastCheckedAt: daysAgo(1),
    },
    {
      seller: sportSeller._id,
      isVerified: false,
      ordersLast30Days: 18,
      completionRate: 0.910,
      trustScore: 4.07,
      accountAgeMonths: 9,
      lastCheckedAt: daysAgo(1),
    },
  ]);
  console.log("  Created 2 verified badges");

  // ── 7. ADDRESSES ───────────────────────────────────────────────────────────
  console.log("\n🏠 Seeding addresses…");
  const addr1 = await Address.create({
    user: buyer1._id,
    fullName: "John Smith",
    phone: "0901234567",
    country: "Vietnam",
    city: "Ho Chi Minh City",
    district: "Quan 1",
    ward: "Phuong Ben Nghe",
    street: "123 Nguyen Hue",
    detail: "Tan 5, Can ho 502",
    isDefault: true,
  });
  const addr2 = await Address.create({
    user: buyer2._id,
    fullName: "Emily Jones",
    phone: "0912345678",
    country: "Vietnam",
    city: "Ha Noi",
    district: "Dong Da",
    ward: "Phuong Lang Ha",
    street: "45 Lang Ha",
    detail: "Tang 3",
    isDefault: true,
  });
  const addr3 = await Address.create({
    user: buyer3._id,
    fullName: "Michael Brown",
    phone: "0923456789",
    country: "Vietnam",
    city: "Da Nang",
    district: "Hai Chau",
    ward: "Phuong Thuan Phuoc",
    street: "78 Tran Phu",
    detail: "Nha rieng",
    isDefault: true,
  });
  console.log("  Created 3 addresses");

  // ── 8. ORDERS + ORDER GROUPS ───────────────────────────────────────────────
  console.log("\n🛒 Seeding orders…");

  const shippingAddr1 = { fullName: "John Smith",    phone: "0901234567", country: "Vietnam", city: "Ho Chi Minh City", district: "Quan 1",  ward: "Phuong Ben Nghe", street: "123 Nguyen Hue", detail: "Tan 5, Can ho 502" };
  const shippingAddr2 = { fullName: "Emily Jones",   phone: "0912345678", country: "Vietnam", city: "Ha Noi",          district: "Dong Da",  ward: "Phuong Lang Ha",   street: "45 Lang Ha",     detail: "Tang 3" };
  const shippingAddr3 = { fullName: "Michael Brown", phone: "0923456789", country: "Vietnam", city: "Da Nang",         district: "Hai Chau", ward: "Phuong Thuan Phuoc",street: "78 Tran Phu",    detail: "Nha rieng" };

  // Helper để tạo order + ordergroup cùng lúc
  async function createOrder(data) {
    const order = await Order.create(data);
    const og = await OrderGroup.create({
      buyer: data.buyer,
      orders: [order._id],
      totalAmount: data.totalAmount,
      status: data.status === "completed" ? "completed"
            : data.status === "delivered" ? "delivered"
            : data.status === "shipping"  ? "shipping"
            : data.status === "packaging" ? "packaging"
            : data.status === "cancelled" ? "cancelled"
            : data.status === "returned"  ? "returned"
            : "created",
      paymentStatus: data.paymentStatus || "paid",
      shippingAddress: data.shippingAddress,
      shippingPrice: data.shippingPrice || 9.99,
      paymentMethod: "cod",
    });
    await Order.findByIdAndUpdate(order._id, { orderGroup: og._id });
    return { order, og };
  }

  // Order 1 — completed, buyer1, techstore headphones ($79.99 + $9.99 ship)
  const { order: o1 } = await createOrder({
    buyer: buyer1._id, seller: techSeller._id, shipper: shipper1._id,
    items: [{ productId: techProducts[0]._id, title: techProducts[0].title, unitPrice: 79.99, quantity: 1, selectedVariants: [{ name: "Color", value: "Black" }] }],
    subtotalAmount: 79.99, totalAmount: 89.98, shippingPrice: 9.99,
    status: "completed", paymentStatus: "paid",
    shippingAddress: shippingAddr1,
    deliveredAt: daysAgo(10),
    statusHistory: [
      { status: "created", timestamp: daysAgo(20), note: "Order placed" },
      { status: "packaging", timestamp: daysAgo(19) },
      { status: "shipping", timestamp: daysAgo(18) },
      { status: "delivered", timestamp: daysAgo(10) },
      { status: "completed", timestamp: daysAgo(5) },
    ],
  });

  // Order 2 — completed, buyer2, techstore keyboard ($89.99 + $9.99 ship)
  const { order: o2 } = await createOrder({
    buyer: buyer2._id, seller: techSeller._id, shipper: shipper2._id,
    items: [{ productId: techProducts[3]._id, title: techProducts[3].title, unitPrice: 89.99, quantity: 1 }],
    subtotalAmount: 89.99, totalAmount: 99.98, shippingPrice: 9.99,
    status: "completed", paymentStatus: "paid",
    shippingAddress: shippingAddr2,
    deliveredAt: daysAgo(15),
    statusHistory: [
      { status: "created", timestamp: daysAgo(25) },
      { status: "packaging", timestamp: daysAgo(24) },
      { status: "shipping", timestamp: daysAgo(22) },
      { status: "delivered", timestamp: daysAgo(15) },
      { status: "completed", timestamp: daysAgo(8) },
    ],
  });

  // Order 3 — completed, buyer3, sportzone yoga mat ($29.99 + $5.99 ship)
  const { order: o3 } = await createOrder({
    buyer: buyer3._id, seller: sportSeller._id, shipper: shipper1._id,
    items: [{ productId: sportProducts[2]._id, title: sportProducts[2].title, unitPrice: 29.99, quantity: 1, selectedVariants: [{ name: "Color", value: "Purple" }] }],
    subtotalAmount: 29.99, totalAmount: 35.98, shippingPrice: 5.99,
    status: "completed", paymentStatus: "paid",
    shippingAddress: shippingAddr3,
    deliveredAt: daysAgo(7),
    statusHistory: [
      { status: "created", timestamp: daysAgo(14) },
      { status: "packaging", timestamp: daysAgo(13) },
      { status: "shipping", timestamp: daysAgo(11) },
      { status: "delivered", timestamp: daysAgo(7) },
      { status: "completed", timestamp: daysAgo(2) },
    ],
  });

  // Order 4 — completed, buyer1, sportzone running shoes ($75.99 + $9.99 ship)
  const { order: o4 } = await createOrder({
    buyer: buyer1._id, seller: sportSeller._id, shipper: shipper2._id,
    items: [{ productId: sportProducts[0]._id, title: sportProducts[0].title, unitPrice: 75.99, quantity: 1, selectedVariants: [{ name: "Size", value: "42" }] }],
    subtotalAmount: 75.99, totalAmount: 85.98, shippingPrice: 9.99,
    status: "completed", paymentStatus: "paid",
    shippingAddress: shippingAddr1,
    deliveredAt: daysAgo(20),
    statusHistory: [
      { status: "created", timestamp: daysAgo(30) },
      { status: "packaging", timestamp: daysAgo(29) },
      { status: "shipping", timestamp: daysAgo(27) },
      { status: "delivered", timestamp: daysAgo(20) },
      { status: "completed", timestamp: daysAgo(13) },
    ],
  });

  // Order 5 — delivered (chưa review), buyer4, techstore SSD ($109.99 + $9.99 ship)
  const { order: o5 } = await createOrder({
    buyer: buyer4._id, seller: techSeller._id, shipper: shipper1._id,
    items: [{ productId: techProducts[5]._id, title: techProducts[5].title, unitPrice: 109.99, quantity: 1 }],
    subtotalAmount: 109.99, totalAmount: 119.98, shippingPrice: 9.99,
    status: "delivered", paymentStatus: "paid",
    shippingAddress: { fullName: "Sarah Davis", phone: "0934567890", country: "Vietnam", city: "Ho Chi Minh City", district: "Binh Thanh", ward: "Phuong 22", street: "56 Xo Viet Nghe Tinh", detail: "" },
    deliveredAt: daysAgo(3),
    statusHistory: [
      { status: "created", timestamp: daysAgo(10) },
      { status: "shipping", timestamp: daysAgo(8) },
      { status: "delivered", timestamp: daysAgo(3) },
    ],
  });

  // Order 6 — delivered, buyer2, sportzone water bottle x2 ($22.99×2 + $5.99 ship)
  const { order: o6 } = await createOrder({
    buyer: buyer2._id, seller: sportSeller._id, shipper: shipper2._id,
    items: [{ productId: sportProducts[3]._id, title: sportProducts[3].title, unitPrice: 22.99, quantity: 2, selectedVariants: [{ name: "Color", value: "Black" }] }],
    subtotalAmount: 45.98, totalAmount: 51.97, shippingPrice: 5.99,
    status: "delivered", paymentStatus: "paid",
    shippingAddress: shippingAddr2,
    deliveredAt: daysAgo(2),
    statusHistory: [
      { status: "created", timestamp: daysAgo(9) },
      { status: "shipping", timestamp: daysAgo(7) },
      { status: "delivered", timestamp: daysAgo(2) },
    ],
  });

  // Order 7 — shipping, buyer5, techstore power bank ($59.99 + $9.99 ship)
  const { order: o7 } = await createOrder({
    buyer: buyer5._id, seller: techSeller._id, shipper: shipper1._id,
    items: [{ productId: techProducts[6]._id, title: techProducts[6].title, unitPrice: 59.99, quantity: 1 }],
    subtotalAmount: 59.99, totalAmount: 69.98, shippingPrice: 9.99,
    status: "shipping", paymentStatus: "paid",
    shippingAddress: { fullName: "Chris Wilson", phone: "0945678901", country: "Vietnam", city: "Ho Chi Minh City", district: "Quan 7", ward: "Phuong Tan Phong", street: "89 Nguyen Van Linh", detail: "" },
    statusHistory: [
      { status: "created", timestamp: daysAgo(5) },
      { status: "packaging", timestamp: daysAgo(4) },
      { status: "shipping", timestamp: daysAgo(1) },
    ],
  });

  // Order 8 — packaging, buyer3, techstore webcam ($49.99 + $9.99 ship)
  const { order: o8 } = await createOrder({
    buyer: buyer3._id, seller: techSeller._id,
    items: [{ productId: techProducts[4]._id, title: techProducts[4].title, unitPrice: 49.99, quantity: 1 }],
    subtotalAmount: 49.99, totalAmount: 59.98, shippingPrice: 9.99,
    status: "packaging", paymentStatus: "paid",
    shippingAddress: shippingAddr3,
    statusHistory: [
      { status: "created", timestamp: daysAgo(2) },
      { status: "packaging", timestamp: daysAgo(1) },
    ],
  });

  // Order 9 — cancelled, buyer4, sportzone cap x2 ($11.99×2 + $5.99 ship)
  const { order: o9 } = await createOrder({
    buyer: buyer4._id, seller: sportSeller._id,
    items: [{ productId: sportProducts[4]._id, title: sportProducts[4].title, unitPrice: 11.99, quantity: 2 }],
    subtotalAmount: 23.98, totalAmount: 29.97, shippingPrice: 5.99,
    status: "cancelled", paymentStatus: "unpaid",
    shippingAddress: { fullName: "Sarah Davis", phone: "0934567890", country: "Vietnam", city: "Ho Chi Minh City", district: "Binh Thanh", ward: "Phuong 22", street: "56 Xo Viet Nghe Tinh", detail: "" },
    statusHistory: [
      { status: "created", timestamp: daysAgo(12) },
      { status: "cancelled", timestamp: daysAgo(11), note: "Customer cancelled" },
    ],
  });

  // Order 10 — returned, buyer1, sportzone gym gloves ($13.99 + $5.99 ship)
  const { order: o10 } = await createOrder({
    buyer: buyer1._id, seller: sportSeller._id, shipper: shipper1._id,
    items: [{ productId: sportProducts[5]._id, title: sportProducts[5].title, unitPrice: 13.99, quantity: 1 }],
    subtotalAmount: 13.99, totalAmount: 19.98, shippingPrice: 5.99,
    status: "returned", paymentStatus: "refunded",
    shippingAddress: shippingAddr1,
    deliveredAt: daysAgo(18),
    statusHistory: [
      { status: "created", timestamp: daysAgo(25) },
      { status: "shipping", timestamp: daysAgo(23) },
      { status: "delivered", timestamp: daysAgo(18) },
      { status: "waiting_return_shipment", timestamp: daysAgo(16), note: "Buyer requested return" },
      { status: "return_shipping", timestamp: daysAgo(14) },
      { status: "returned", timestamp: daysAgo(12) },
    ],
  });

  console.log("  Created 10 orders");

  // ── 9. REVIEWS ─────────────────────────────────────────────────────────────
  console.log("\n⭐ Seeding reviews…");
  await Review.insertMany([
    {
      order: o1._id, product: techProducts[0]._id,
      reviewer: buyer1._id, seller: techSeller._id,
      rating: 5, rating1: 5, rating2: 5, rating3: 5,
      comment: "Excellent headphones! The noise cancellation is impressive, battery life is as advertised. Highly recommend!",
      type: "positive",
      sellerResponse: "Thank you for your kind review! We're glad you enjoy the headphones.",
      sellerResponseAt: daysAgo(4),
    },
    {
      order: o2._id, product: techProducts[3]._id,
      reviewer: buyer2._id, seller: techSeller._id,
      rating: 4, rating1: 4, rating2: 5, rating3: 4,
      comment: "Great keyboard with satisfying key feedback. Build quality is solid. Shipping was fast.",
      type: "positive",
    },
    {
      order: o3._id, product: sportProducts[2]._id,
      reviewer: buyer3._id, seller: sportSeller._id,
      rating: 5, rating1: 5, rating2: 5, rating3: 4,
      comment: "Perfect yoga mat. Non-slip surface works great, odorless, and easy to clean. The carry bag is a nice bonus.",
      type: "positive",
      sellerResponse: "Glad you love it! Stay fit and healthy!",
      sellerResponseAt: daysAgo(1),
    },
    {
      order: o4._id, product: sportProducts[0]._id,
      reviewer: buyer1._id, seller: sportSeller._id,
      rating: 4, rating1: 4, rating2: 4, rating3: 5,
      comment: "Good running shoes, lightweight and comfortable. Fit is true to size. The cushioning is great for long runs.",
      type: "positive",
    },
  ]);
  console.log("  Created 4 reviews");

  // ── 10. VOUCHERS ───────────────────────────────────────────────────────────
  console.log("\n🎟  Seeding vouchers…");
  await Voucher.insertMany([
    {
      code: "WELCOME10",
      scope: "global",
      type: "percentage",
      value: 10,
      minOrderValue: 20,
      maxDiscountAmount: 10,
      usageLimit: 500,
      usedCount: 12,
      perUserLimit: 1,
      startDate: daysAgo(30),
      endDate: daysFromNow(60),
      isActive: true,
      createdBy: adminUser._id,
      source: "admin_created",
    },
    {
      code: "TECH20",
      seller: techSeller._id,
      scope: "seller",
      type: "percentage",
      value: 20,
      minOrderValue: 50,
      maxDiscountAmount: 20,
      usageLimit: 100,
      usedCount: 8,
      perUserLimit: 1,
      startDate: daysAgo(15),
      endDate: daysFromNow(15),
      isActive: true,
      createdBy: techSeller._id,
      source: "seller_request",
    },
    {
      code: "SPORT5",
      seller: sportSeller._id,
      scope: "seller",
      type: "fixed",
      value: 5,
      minOrderValue: 30,
      usageLimit: 50,
      usedCount: 3,
      perUserLimit: 1,
      startDate: daysAgo(7),
      endDate: daysFromNow(23),
      isActive: true,
      createdBy: sportSeller._id,
      source: "seller_request",
    },
  ]);
  console.log("  Created 3 vouchers");

  // ── 11. COMPLAINTS ─────────────────────────────────────────────────────────
  console.log("\n⚠️  Seeding complaints…");
  await Complaint.create({
    order: o5._id,
    buyer: buyer4._id,
    seller: techSeller._id,
    reason: "late",
    content: "The SSD arrived much later than expected. The tracking showed it was stuck in transit for 5 days without updates. Please improve your logistics.",
    status: "OPEN",
    history: [{ actionBy: buyer4._id, action: "OPEN", note: "Complaint submitted by buyer", at: daysAgo(2) }],
  });
  console.log("  Created 1 complaint");

  // ── 12. BUYER REPORT STATS ─────────────────────────────────────────────────
  console.log("\n📊 Seeding buyer report stats…");
  await BuyerReportStats.insertMany([
    { buyer: buyer1._id, totalReports: 3, validReports: 2, rejectedReports: 1, accuracyScore: 0.67, lastReportAt: daysAgo(15) },
    { buyer: buyer2._id, totalReports: 1, validReports: 1, rejectedReports: 0, accuracyScore: 1.0,  lastReportAt: daysAgo(30) },
  ]);
  console.log("  Created 2 buyer report stats");

  // ── 13. NOTIFICATIONS ──────────────────────────────────────────────────────
  console.log("\n🔔 Seeding notifications…");
  await Notification.insertMany([
    {
      recipient: buyer1._id,
      type: "order_completed",
      title: "Order Completed",
      body: `Your order for "${techProducts[0].title}" has been completed. You can now leave a review!`,
      link: `/buyer/orders/${o1._id}`,
      isRead: true,
    },
    {
      recipient: buyer2._id,
      type: "order_completed",
      title: "Order Completed",
      body: `Your order for "${techProducts[3].title}" has been completed. Thank you for shopping!`,
      link: `/buyer/orders/${o2._id}`,
      isRead: false,
    },
    {
      recipient: buyer4._id,
      type: "order_delivered",
      title: "Order Delivered",
      body: `Your order for "${techProducts[5].title}" has been delivered. Please confirm receipt.`,
      link: `/buyer/orders/${o5._id}`,
      isRead: false,
    },
    {
      recipient: buyer5._id,
      type: "order_shipping",
      title: "Order Shipped",
      body: `Your order for "${techProducts[6].title}" is on the way!`,
      link: `/buyer/orders/${o7._id}`,
      isRead: false,
    },
    {
      recipient: techSeller._id,
      type: "new_review",
      title: "New Review Received",
      body: `${buyer1.username} left a 5-star review for "${techProducts[0].title}".`,
      link: `/seller/reviews`,
      isRead: false,
    },
    {
      recipient: techSeller._id,
      type: "new_complaint",
      title: "New Complaint",
      body: "A buyer has opened a complaint regarding order delivery time. Please review.",
      link: `/seller/complaints`,
      isRead: false,
    },
    {
      recipient: sportSeller._id,
      type: "new_review",
      title: "New Review Received",
      body: `${buyer3.username} left a 5-star review for "${sportProducts[2].title}".`,
      link: `/seller/reviews`,
      isRead: true,
    },
    {
      recipient: adminUser._id,
      type: "new_complaint",
      title: "Complaint Opened",
      body: "A new buyer complaint has been submitted and requires admin attention.",
      link: `/admin/complaints`,
      isRead: false,
    },
  ]);
  console.log("  Created 8 notifications");

  // ── 14. REVENUE ────────────────────────────────────────────────────────────
  console.log("\n💰 Seeding revenue…");

  // system_commission = 5% subtotal, system_shipping = shippingPrice, seller_revenue = 95% subtotal
  const addRevenue = async (order, seller, subtotal, shipping, createdAt) => {
    const commission = parseFloat((subtotal * 0.05).toFixed(2));
    const sellerNet  = parseFloat((subtotal * 0.95).toFixed(2));
    await Revenue.insertMany([
      { type: "system_commission", order: order._id, seller: seller._id, amount: commission, createdAt },
      { type: "system_shipping",   order: order._id, amount: shipping, createdAt },
      { type: "seller_revenue",    order: order._id, seller: seller._id, amount: sellerNet, createdAt },
    ]);
  };

  // Recent orders (paid)
  await addRevenue(o1, techSeller,  79.99,  9.99, daysAgo(20));   // headphones, completed
  await addRevenue(o2, techSeller,  89.99,  9.99, daysAgo(25));   // keyboard, completed
  await addRevenue(o3, sportSeller, 29.99,  5.99, daysAgo(14));   // yoga mat, completed
  await addRevenue(o4, sportSeller, 75.99,  9.99, daysAgo(30));   // running shoes, completed
  await addRevenue(o5, techSeller, 109.99,  9.99, daysAgo(10));   // SSD, delivered
  await addRevenue(o6, sportSeller, 45.98,  5.99, daysAgo(9));    // water bottle x2, delivered
  await addRevenue(o7, techSeller,  59.99,  9.99, daysAgo(5));    // power bank, shipping
  await addRevenue(o8, techSeller,  49.99,  9.99, daysAgo(2));    // webcam, packaging

  // Historical revenue — 5 months of data for monthly chart
  const historicalOrders = [
    // Month -5
    { seller: techSeller,  sub: 68.99,  ship: 9.99, dAgo: 155 },
    { seller: sportSeller, sub: 42.99,  ship: 5.99, dAgo: 150 },
    { seller: techSeller,  sub: 89.99,  ship: 9.99, dAgo: 148 },
    // Month -4
    { seller: techSeller,  sub: 79.99,  ship: 9.99, dAgo: 120 },
    { seller: techSeller,  sub: 29.99,  ship: 5.99, dAgo: 118 },
    { seller: sportSeller, sub: 75.99,  ship: 9.99, dAgo: 115 },
    { seller: sportSeller, sub: 22.99,  ship: 5.99, dAgo: 112 },
    // Month -3
    { seller: techSeller,  sub: 109.99, ship: 9.99, dAgo: 90 },
    { seller: techSeller,  sub: 59.99,  ship: 9.99, dAgo: 88 },
    { seller: sportSeller, sub: 29.99,  ship: 5.99, dAgo: 85 },
    { seller: techSeller,  sub: 49.99,  ship: 9.99, dAgo: 82 },
    { seller: sportSeller, sub: 17.99,  ship: 5.99, dAgo: 80 },
    // Month -2
    { seller: techSeller,  sub: 79.99,  ship: 9.99, dAgo: 60 },
    { seller: techSeller,  sub: 13.99,  ship: 5.99, dAgo: 58 },
    { seller: sportSeller, sub: 75.99,  ship: 9.99, dAgo: 55 },
    { seller: techSeller,  sub: 89.99,  ship: 9.99, dAgo: 52 },
    { seller: sportSeller, sub: 45.98,  ship: 5.99, dAgo: 50 },
    { seller: techSeller,  sub: 65.99,  ship: 9.99, dAgo: 48 },
    // Month -1
    { seller: techSeller,  sub: 109.99, ship: 9.99, dAgo: 35 },
    { seller: sportSeller, sub: 29.99,  ship: 5.99, dAgo: 33 },
    { seller: techSeller,  sub: 79.99,  ship: 9.99, dAgo: 32 },
    { seller: sportSeller, sub: 75.99,  ship: 9.99, dAgo: 28 },
    { seller: techSeller,  sub: 49.99,  ship: 9.99, dAgo: 26 },
    { seller: sportSeller, sub: 22.99,  ship: 5.99, dAgo: 24 },
    { seller: techSeller,  sub: 59.99,  ship: 9.99, dAgo: 22 },
  ];

  for (const h of historicalOrders) {
    const commission = parseFloat((h.sub * 0.05).toFixed(2));
    const sellerNet  = parseFloat((h.sub * 0.95).toFixed(2));
    const createdAt  = daysAgo(h.dAgo);
    await Revenue.insertMany([
      { type: "system_commission", seller: h.seller._id, amount: commission, createdAt },
      { type: "system_shipping",   amount: h.ship, createdAt },
      { type: "seller_revenue",    seller: h.seller._id, amount: sellerNet, createdAt },
    ]);
  }

  const totalRevenueRecords = (8 + historicalOrders.length) * 3;
  console.log(`  Created ${totalRevenueRecords} revenue records`);

  // ── 15. CARTS ──────────────────────────────────────────────────────────────
  console.log("\n🛍  Seeding carts…");
  const cart3 = await Cart.create({ user: buyer3._id, totalPrice: 0, totalItems: 0, status: "active" });
  await CartItem.create({
    cart: cart3._id,
    product: techProducts[1]._id,
    seller: techSeller._id,
    quantity: 2,
    priceSnapShot: 29.99,
    variantKey: "",
  });
  await Cart.findByIdAndUpdate(cart3._id, { totalPrice: 59.98, totalItems: 2 });
  console.log("  Created 1 cart with items");

  // ── DONE ───────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed completed successfully!\n");
  console.log("─────────────────────────────────────────────────────");
  console.log("  Test accounts (password: password123):");
  console.log("  Admin  : admin@admin.com     / admin");
  console.log("  Seller : techstore@wdp.com   / password123");
  console.log("  Seller : sportzone@wdp.com   / password123");
  console.log("  Buyer  : buyer1@wdp.com      / password123");
  console.log("  Buyer  : buyer2@wdp.com      / password123");
  console.log("  Buyer  : buyer3@wdp.com      / password123");
  console.log("  Buyer  : buyer4@wdp.com      / password123");
  console.log("  Buyer  : buyer5@wdp.com      / password123");
  console.log("  Shipper: shipper1@wdp.com    / password123");
  console.log("  Shipper: shipper2@wdp.com    / password123");
  console.log("─────────────────────────────────────────────────────");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
