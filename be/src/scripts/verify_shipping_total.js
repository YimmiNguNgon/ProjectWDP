require('dotenv').config({ path: 'c:/Users/Admin/Documents/GitHub/ProjectWDP/be/.env' });
const sendEmail = require('c:/Users/Admin/Documents/GitHub/ProjectWDP/be/src/utils/sendEmail');
const mongoose = require('mongoose');

async function testShippingTotal() {
  console.log("🚀 Starting shipping total verification test...");
  
  const shippingPrice = 10.00;
  const subtotal = 150.50;
  const totalAmount = subtotal + shippingPrice;

  const mockData = {
    username: "TestUser",
    orderGroupId: new mongoose.Types.ObjectId().toString(),
    date: new Date().toLocaleDateString('vi-VN'),
    totalAmount: totalAmount, // Should be 160.5
    paymentMethod: "COD",
    shippingAddress: {
      fullName: "Nguyễn Văn A",
      phone: "0987654321",
      street: "123 Đường ABC", // Updated from 'detail' to 'street' as per user's template edit
      ward: "Phường 1",
      district: "Quận 1",
      city: "TP. Hồ Chí Minh"
    },
    orderUrl: "http://localhost:5173/my-ebay/activity/purchases"
  };

  try {
    const to = process.env.EMAIL_USER;
    if (!to) {
      console.error("❌ EMAIL_USER not found in .env");
      return;
    }

    console.log(`📧 Sending verification email with total ${totalAmount} (subtotal ${subtotal} + shipping ${shippingPrice}) to ${to}...`);
    
    await sendEmail({
      to: to,
      subject: "Verification - Order Total with Shipping - EFPT",
      template: "orderSuccess.ejs",
      data: mockData
    });

    console.log("✅ Shipping total verification COMPLETED successfully.");
  } catch (error) {
    console.error("❌ Shipping total verification FAILED:", error);
  }
}

testShippingTotal();
