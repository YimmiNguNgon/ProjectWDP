const SellerApplication = require("../models/SellerApplication");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const notificationService = require("../services/notificationService");

// User gửi đơn đăng ký trở thành seller
exports.submitApplication = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Kiểm tra user đã là seller hay admin chưa
        if (req.user.role === "seller" || req.user.role === "admin") {
            return res.status(400).json({ message: "Tài khoản của bạn đã có quyền seller hoặc admin" });
        }

        // Kiểm tra đã có đơn pending chưa
        const existing = await SellerApplication.findOne({ user: userId, status: "pending" });
        if (existing) {
            return res.status(400).json({ message: "Bạn đã có đơn đăng ký đang chờ xét duyệt" });
        }

        const { shopName, phoneNumber, bankAccountNumber, bankName, productDescription } = req.body;

        if (!shopName || !phoneNumber || !bankAccountNumber || !bankName || !productDescription) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
        }

        const application = await SellerApplication.create({
            user: userId,
            shopName,
            phoneNumber,
            bankAccountNumber,
            bankName,
            productDescription,
        });

        return res.status(201).json({ message: "Đơn đăng ký đã được gửi thành công", data: application });
    } catch (error) {
        next(error);
    }
};

// User xem trạng thái đơn của mình
exports.getMyApplication = async (req, res, next) => {
    try {
        const application = await SellerApplication.findOne({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate("reviewedBy", "username");

        return res.status(200).json({ data: application });
    } catch (error) {
        next(error);
    }
};

// Admin: lấy danh sách đơn
exports.getAllApplications = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [applications, total] = await Promise.all([
            SellerApplication.find(filter)
                .populate("user", "username email")
                .populate("reviewedBy", "username")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            SellerApplication.countDocuments(filter),
        ]);

        return res.status(200).json({ data: applications, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        next(error);
    }
};

// Admin: duyệt đơn
exports.approveApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;

        const application = await SellerApplication.findById(id).populate("user");
        if (!application) {
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }
        if (application.status !== "pending") {
            return res.status(400).json({ message: "Đơn này đã được xử lý rồi" });
        }

        // Cập nhật đơn
        application.status = "approved";
        application.adminNote = adminNote || "";
        application.reviewedBy = req.user._id;
        application.reviewedAt = new Date();
        await application.save();

        // Nâng cấp role user thành seller
        await User.findByIdAndUpdate(application.user._id, { role: "seller" });

        // Gửi email thông báo
        try {
            await sendEmail({
                to: application.user.email,
                subject: "Chúc mừng! Đơn đăng ký seller của bạn đã được duyệt",
                template: "sellerApproved.ejs",
                data: {
                    username: application.user.username,
                    shopName: application.shopName,
                    adminNote: adminNote || "",
                },
            });
        } catch (emailErr) {
            console.error("Gửi email thông báo thất bại:", emailErr.message);
        }

        // Gui notification realtime
        await notificationService.sendNotification({
            recipientId: application.user._id,
            type: "seller_application_approved",
            title: "Don dang ky Seller da duoc duyet!",
            body: `Chuc mung! Shop "${application.shopName}" cua ban da duoc phe duyet. Ban co the bat dau ban hang ngay.`,
            link: "/seller",
            metadata: { shopName: application.shopName },
        });

        return res.status(200).json({ message: "Da duyet don thanh cong", data: application });
    } catch (error) {
        next(error);
    }
};

// Admin: từ chối đơn
exports.rejectApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;

        const application = await SellerApplication.findById(id).populate("user");
        if (!application) {
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }
        if (application.status !== "pending") {
            return res.status(400).json({ message: "Đơn này đã được xử lý rồi" });
        }

        application.status = "rejected";
        application.adminNote = adminNote || "";
        application.reviewedBy = req.user._id;
        application.reviewedAt = new Date();
        await application.save();

        // Gửi email thông báo từ chối
        try {
            await sendEmail({
                to: application.user.email,
                subject: "Đơn đăng ký seller của bạn chưa được duyệt",
                template: "sellerRejected.ejs",
                data: {
                    username: application.user.username,
                    shopName: application.shopName,
                    adminNote: adminNote || "Đơn của bạn không đáp ứng yêu cầu hiện tại.",
                },
            });
        } catch (emailErr) {
            console.error("Gửi email thông báo thất bại:", emailErr.message);
        }

        // Gui notification realtime
        await notificationService.sendNotification({
            recipientId: application.user._id,
            type: "seller_application_rejected",
            title: "Don dang ky Seller chua duoc duyet",
            body: `Don dang ky shop "${application.shopName}" chua duoc chap thuan. ${adminNote ? 'Ly do: ' + adminNote : ''}`,
            link: "/become-seller",
            metadata: { shopName: application.shopName },
        });

        return res.status(200).json({ message: "Da tu choi don", data: application });
    } catch (error) {
        next(error);
    }
};
