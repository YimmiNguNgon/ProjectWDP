/**
 * Middleware: Gửi email thông báo sau khi buyer đăng ký seller thành công (201).
 * ➡️  Chỉ THÊM middleware này vào route — KHÔNG sửa bất kỳ code cũ nào.
 *
 * Cơ chế: wrap res.json() để "nghe" response của controller.
 * Nếu statusCode === 201 (tạo đơn thành công) → gửi email xác nhận tới user.
 */

const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

const sellerEmailNotify = async (req, res, next) => {
    // Lưu lại hàm res.json gốc
    const originalJson = res.json.bind(res);

    // Override res.json để intercept response
    res.json = async function (body) {
        // Chỉ xử lý khi controller trả về 201 (tạo đơn thành công)
        if (res.statusCode === 201 && body && body.data) {
            try {
                // Lấy thông tin user từ DB để có email
                const user = await User.findById(req.user._id)
                    .select("email username")
                    .lean();

                if (user && user.email) {
                    const shopName = body.data.shopName || "Shop của bạn";
                    const registeredAt = new Date().toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    // Gửi email không chặn response — fire and forget
                    sendEmail({
                        to: user.email,
                        subject: "🎉 Chúc mừng! Bạn đã đăng ký Seller thành công",
                        template: "sellerRegistered.ejs",
                        data: {
                            username: user.username,
                            shopName,
                            registeredAt,
                        },
                    }).catch((err) => {
                        console.error("[sellerEmailNotify] Gửi email thất bại:", err.message);
                    });
                }
            } catch (err) {
                // Không để lỗi email block response
                console.error("[sellerEmailNotify] Lỗi khi xử lý email:", err.message);
            }
        }

        // Trả về response như bình thường
        return originalJson(body);
    };

    next();
};

module.exports = sellerEmailNotify;
