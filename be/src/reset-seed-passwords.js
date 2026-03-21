require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const accounts = [
  { email: "seedadmin@wdp.com",  password: "admin123" },
  { email: "techstore@wdp.com",  password: "password123" },
  { email: "sportzone@wdp.com",  password: "password123" },
  { email: "buyer1@wdp.com",     password: "password123" },
  { email: "buyer2@wdp.com",     password: "password123" },
  { email: "buyer3@wdp.com",     password: "password123" },
  { email: "buyer4@wdp.com",     password: "password123" },
  { email: "buyer5@wdp.com",     password: "password123" },
  { email: "shipper1@wdp.com",   password: "password123" },
  { email: "shipper2@wdp.com",   password: "password123" },
];

const sellerInfoMap = {
  "techstore@wdp.com": {
    shopName: "TechStore VN",
    productDescription: "Genuine electronics accessories, fast nationwide delivery.",
    successOrders: 142,
    avgRating: 4.7,
    refundRate: 1.2,
    reportRate: 0.5,
    isVerifiedSeller: true,
  },
  "sportzone@wdp.com": {
    shopName: "SportZone HCM",
    productDescription: "High-quality sports gear at the best prices. Authentic products guaranteed.",
    successOrders: 87,
    avgRating: 4.5,
    refundRate: 2.1,
    reportRate: 0.8,
    isVerifiedSeller: false,
  },
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
  for (const acc of accounts) {
    const hashed = await bcrypt.hash(acc.password, 10);
    const update = { passwordHash: hashed, isEmailVerified: true, status: "active" };
    if (sellerInfoMap[acc.email]) {
      update.sellerInfo = sellerInfoMap[acc.email];
      update.sellerStage = "NORMAL";
    }
    const result = await User.findOneAndUpdate({ email: acc.email }, update);
    if (result) {
      console.log("✅ Reset:", acc.email, "/", acc.password);
    } else {
      console.log("❌ Not found:", acc.email);
    }
  }
  process.exit(0);
});
