const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const sendEmail = async ({ to, subject, template, data }) => {
  // 1. Cấu hình transporter
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log("⚠️ Email credentials not configured, skipping email send");
    return; // Bỏ qua gửi email nếu không có config
  }

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

  // 2. Render file EJS thành HTML
  const templatePath = path.join(__dirname, "..", "views", "emails", template);
  const html = await ejs.renderFile(templatePath, data);

  // 3. Gửi mail
  const mailOptions = {
    from: `"My App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
