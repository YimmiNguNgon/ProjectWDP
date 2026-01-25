# BUYER → SELLER LOGIC (eBay-style)

## 🎯 Tổng quan

Hệ thống cho phép **buyer tự động trở thành seller** khi đăng bán sản phẩm đầu tiên, giống eBay.

---

## 📊 SELLER TIERS (Cấp độ seller)

### 1. **NEW** (Seller mới)
**Điều kiện:** Vừa mới list sản phẩm đầu tiên

**Giới hạn:**
- ✅ Tối đa 10 sản phẩm
- ✅ Tổng giá trị tối đa: $5,000
- ❌ Không được bán category nhạy cảm (Electronics, Jewelry)
- ❌ Không được tham gia Daily Deals
- ❌ Không được tham gia Brand Outlet
- ❌ Không được tạo Store

**Thời gian:** 0-30 ngày hoặc đến khi đủ điều kiện

---

### 2. **BASIC** (Seller cơ bản)
**Điều kiện nâng cấp:**
- ✅ Bán được ít nhất **5 đơn hàng**
- ✅ Positive rate ≥ **90%**
- ✅ Không có dispute nào

**Giới hạn:**
- ✅ Tối đa 50 sản phẩm
- ✅ Tổng giá trị tối đa: $25,000
- ✅ Được bán hầu hết categories
- ❌ Không được tham gia Daily Deals
- ❌ Không được tham gia Brand Outlet
- ❌ Không được tạo Store

**Thời gian:** 30-90 ngày

---

### 3. **VERIFIED** (Seller đã xác minh)
**Điều kiện nâng cấp:**
- ✅ Bán được ít nhất **20 đơn hàng**
- ✅ Tổng doanh thu ≥ **$2,000**
- ✅ Positive rate ≥ **95%**
- ✅ Dispute rate < **2%**
- ✅ Xác minh phương thức thanh toán (payout)

**Giới hạn:**
- ✅ Tối đa 200 sản phẩm
- ✅ Tổng giá trị tối đa: $100,000
- ✅ Được bán tất cả categories
- ✅ **Được tham gia Brand Outlet**
- ✅ **Được tạo Store**
- ❌ Chưa được tham gia Daily Deals

**Thời gian:** 90+ ngày

---

### 4. **PREMIUM** (Seller cao cấp)
**Điều kiện nâng cấp:**
- ✅ Bán được ít nhất **100 đơn hàng**
- ✅ Tổng doanh thu ≥ **$10,000**
- ✅ Positive rate ≥ **98%**
- ✅ Dispute rate < **1%**
- ✅ Có Store hoạt động tốt

**Giới hạn:**
- ✅ **Không giới hạn** số lượng sản phẩm
- ✅ **Không giới hạn** tổng giá trị
- ✅ Được bán tất cả categories
- ✅ **Được tham gia Daily Deals**
- ✅ **Được tham gia Brand Outlet**
- ✅ Có Store với URL riêng
- ✅ Ưu tiên trong search results

---

## 🔄 QUY TRÌNH BUYER → SELLER

### Bước 1: Buyer bình thường
```
User {
  role: "buyer",
  sellerTier: null,
  becameSellerAt: null
}
```

### Bước 2: Click "Sell" / "List an item"
**Hệ thống tự động:**
1. Kiểm tra `isEmailVerified` = true
2. Nếu chưa verify → Yêu cầu verify email
3. Nếu đã verify → Cho phép list sản phẩm

### Bước 3: Tạo sản phẩm đầu tiên
**Hệ thống tự động cập nhật:**
```javascript
User.findByIdAndUpdate(userId, {
  role: "seller",
  sellerTier: "new",
  becameSellerAt: new Date(),
  sellerLimits: {
    maxListings: 10,
    maxTotalValue: 5000,
    restrictedCategories: ["electronics", "jewelry"]
  },
  sellerStats: {
    totalSales: 0,
    totalOrders: 0,
    positiveRate: 0,
    disputeCount: 0
  }
});
```

### Bước 4: Bán hàng & Nhận feedback
**Sau mỗi đơn hàng hoàn thành:**
```javascript
// Cập nhật stats
sellerStats.totalOrders += 1;
sellerStats.totalSales += order.totalAmount;

// Tính positive rate từ reviews
const reviews = await Review.find({ seller: sellerId });
const positiveCount = reviews.filter(r => r.type === 'positive').length;
sellerStats.positiveRate = (positiveCount / reviews.length) * 100;

// Kiểm tra nâng cấp tier
checkAndUpgradeTier(userId);
```

### Bước 5: Tự động nâng cấp tier
**Hệ thống chạy cron job hàng ngày:**
```javascript
async function checkAndUpgradeTier(userId) {
  const user = await User.findById(userId);
  const stats = user.sellerStats;
  
  // Check upgrade từ NEW → BASIC
  if (user.sellerTier === 'new') {
    if (stats.totalOrders >= 5 && 
        stats.positiveRate >= 90 && 
        stats.disputeCount === 0) {
      
      await User.updateOne({ _id: userId }, {
        sellerTier: 'basic',
        sellerLimits: {
          maxListings: 50,
          maxTotalValue: 25000,
          restrictedCategories: []
        }
      });
      
      // Log upgrade
      await SellerTierUpgrade.create({
        userId,
        fromTier: 'new',
        toTier: 'basic',
        meetsConditions: stats
      });
      
      // Send notification
      sendEmail(user.email, 'Congratulations! You are now a BASIC seller');
    }
  }
  
  // Check upgrade từ BASIC → VERIFIED
  if (user.sellerTier === 'basic') {
    if (stats.totalOrders >= 20 && 
        stats.totalSales >= 2000 &&
        stats.positiveRate >= 95 && 
        stats.disputeCount / stats.totalOrders < 0.02 &&
        user.payoutMethodVerified) {
      
      await User.updateOne({ _id: userId }, {
        sellerTier: 'verified',
        sellerLimits: {
          maxListings: 200,
          maxTotalValue: 100000,
          restrictedCategories: []
        }
      });
      
      // Cho phép tạo store
      sendEmail(user.email, 'You can now create your Store!');
    }
  }
  
  // Check upgrade từ VERIFIED → PREMIUM
  if (user.sellerTier === 'verified') {
    if (stats.totalOrders >= 100 && 
        stats.totalSales >= 10000 &&
        stats.positiveRate >= 98 && 
        stats.disputeCount / stats.totalOrders < 0.01 &&
        user.hasStore) {
      
      await User.updateOne({ _id: userId }, {
        sellerTier: 'premium',
        sellerLimits: {
          maxListings: -1, // unlimited
          maxTotalValue: -1, // unlimited
          restrictedCategories: []
        }
      });
      
      sendEmail(user.email, 'Welcome to PREMIUM tier! You can now join Daily Deals!');
    }
  }
}
```

---

## 🛡️ VALIDATION KHI LIST SẢN PHẨM

```javascript
async function validateProductListing(sellerId, productData) {
  const user = await User.findById(sellerId);
  const limits = user.sellerLimits;
  
  // Check số lượng sản phẩm
  const currentListings = await Product.countDocuments({ 
    sellerId, 
    listingStatus: 'active' 
  });
  
  if (currentListings >= limits.maxListings) {
    throw new Error(`You can only list ${limits.maxListings} products. Upgrade your tier!`);
  }
  
  // Check tổng giá trị
  const totalValue = await Product.aggregate([
    { $match: { sellerId, listingStatus: 'active' } },
    { $group: { _id: null, total: { $sum: '$price' } } }
  ]);
  
  if (totalValue[0]?.total + productData.price > limits.maxTotalValue) {
    throw new Error(`Total value limit exceeded. Upgrade your tier!`);
  }
  
  // Check category bị giới hạn
  const category = await Category.findById(productData.categoryId);
  if (limits.restrictedCategories.includes(category.slug)) {
    throw new Error(`This category requires VERIFIED seller tier`);
  }
  
  return true;
}
```

---

## 🎁 VALIDATION KHI REQUEST PROMOTION

```javascript
async function validatePromotionRequest(sellerId, requestType) {
  const user = await User.findById(sellerId);
  
  // Brand Outlet: cần VERIFIED trở lên
  if (requestType === 'outlet') {
    if (!['verified', 'premium'].includes(user.sellerTier)) {
      throw new Error('Brand Outlet requires VERIFIED seller tier');
    }
  }
  
  // Daily Deals: chỉ PREMIUM
  if (requestType === 'daily_deal') {
    if (user.sellerTier !== 'premium') {
      throw new Error('Daily Deals requires PREMIUM seller tier');
    }
  }
  
  return true;
}
```

---

## 📧 NOTIFICATIONS

### Khi trở thành seller:
```
Subject: Welcome to selling on [Platform]!
Body: You are now a NEW seller. You can list up to 10 products.
```

### Khi nâng cấp tier:
```
Subject: Congratulations! You are now a BASIC seller
Body: Your limits have been increased:
- Max listings: 50
- Max total value: $25,000
- All categories unlocked
```

### Khi đủ điều kiện tạo Store:
```
Subject: You can now create your Store!
Body: As a VERIFIED seller, you can create your own branded store.
```

### Khi đạt PREMIUM:
```
Subject: Welcome to PREMIUM tier!
Body: You now have:
- Unlimited listings
- Access to Daily Deals
- Priority in search results
```

---

## 🔍 SUMMARY

| Tier | Orders | Sales | Positive Rate | Dispute Rate | Max Listings | Max Value | Daily Deals | Outlet | Store |
|------|--------|-------|---------------|--------------|--------------|-----------|-------------|--------|-------|
| NEW | 0 | $0 | - | - | 10 | $5K | ❌ | ❌ | ❌ |
| BASIC | 5+ | - | 90%+ | 0% | 50 | $25K | ❌ | ❌ | ❌ |
| VERIFIED | 20+ | $2K+ | 95%+ | <2% | 200 | $100K | ❌ | ✅ | ✅ |
| PREMIUM | 100+ | $10K+ | 98%+ | <1% | ∞ | ∞ | ✅ | ✅ | ✅ |

---

## 🎯 KẾT LUẬN

Hệ thống này:
- ✅ Tự động chuyển buyer → seller
- ✅ Bảo vệ platform khỏi seller kém chất lượng
- ✅ Khuyến khích seller phát triển
- ✅ Tạo động lực nâng cấp tier
- ✅ Giống eBay 100%
