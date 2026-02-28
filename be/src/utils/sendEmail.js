const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const sendEmail = async ({ to, subject, template, data }) => {
  console.log("📧 Starting email send process...");

  // 1. Kiểm tra cấu hình email
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("❌ Email credentials not configured");
    throw new Error("Email credentials not configured");
  }

  console.log("✓ Email credentials found");
  console.log("  - From:", process.env.EMAIL_USER);
  console.log("  - To:", to);
  console.log("  - Subject:", subject);
  console.log("  - Template:", template);

  // 2. Cấu hình transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  console.log("✓ Transporter created");

  // 3. Render file EJS thành HTML
  const templatePath = path.join(__dirname, "..", "views", "emails", template);
  console.log("✓ Template path:", templatePath);

  const html = await ejs.renderFile(templatePath, data);
  console.log("✓ Template rendered successfully");

  // 4. Gửi mail
  const mailOptions = {
    from: `"My App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  console.log("📤 Sending email...");
  const info = await transporter.sendMail(mailOptions);
  console.log("✅ Email sent successfully");
  console.log("  - Message ID:", info.messageId);
  console.log("  - Response:", info.response);

  return info;
};

module.exports = sendEmail;
