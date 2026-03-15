const SellerApplication = require("../models/SellerApplication");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const notificationService = require("../services/notificationService");

// ─── Buyer tự đăng ký trở thành Seller (tự động approve 100%) ────────────────
exports.submitApplication = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Không cho phép nếu đã là seller hoặc admin
        if (req.user.role === "seller" || req.user.role === "admin") {
            return res.status(400).json({ message: "You already have seller or admin role" });
        }

        // Phải verify email trước
        if (!req.user.isEmailVerified) {
            return res.status(400).json({ message: "Please verify your email before applying for seller" });
        }

        // Kiểm tra đã có đơn approved trước đó chưa (tránh submit nhiều lần)
        const existing = await SellerApplication.findOne({ user: userId });
        if (existing) {
            return res.status(400).json({ message: "You have already applied for seller" });
        }

        const { shopName, productDescription } = req.body;

        if (!shopName || !productDescription) {
            return res.status(400).json({ message: "Please fill in all required information" });
        }
        if (productDescription.length < 20) {
            return res.status(400).json({ message: "Product description must be at least 20 characters" });
        }

        const now = new Date();

        // Tạo đơn với status = approved ngay lập tức
        const application = await SellerApplication.create({
            user: userId,
            shopName,
            productDescription,
            status: "approved",
            reviewedAt: now,
        });

        // Nâng cấp role + set sellerStage = PROBATION
        await User.findByIdAndUpdate(userId, {
            role: "seller",
            sellerStage: "PROBATION",
            "sellerInfo.shopName": shopName,
            "sellerInfo.productDescription": productDescription,
            "sellerInfo.registeredAt": now,
            "sellerInfo.lastStageChangedAt": now,
        });

        // Gửi notification realtime
        try {
            await notificationService.sendNotification({
                recipientId: userId,
                type: "seller_application_approved",
                title: "🎉 Congratulations! Your seller application has been approved",
                body: `Shop "${shopName}" has been activated. You are now in the PROBATION stage (trial period). Start selling your products!`,
                link: "/seller",
                metadata: { shopName, sellerStage: "PROBATION" },
            });
        } catch (notifErr) {
            console.error("[SellerApply] Gửi notification thất bại:", notifErr.message);
        }

        return res.status(201).json({
            message: "Seller application approved successfully! You are now in the PROBATION stage (trial period). Start selling your products!",
            data: application,
            sellerStage: "PROBATION",
        });
    } catch (error) {
        next(error);
    }
};

// ─── User xem trạng thái đơn của mình ─────────────────────────────────────────
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

// ─── Admin: lấy danh sách đơn ─────────────────────────────────────────────────
exports.getAllApplications = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [applications, total] = await Promise.all([
            SellerApplication.find(filter)
                .populate("user", "username email sellerStage")
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

// ─── Admin: duyệt đơn (giữ lại cho trường hợp dùng tới) ─────────────────────
exports.approveApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;

        const application = await SellerApplication.findById(id).populate("user");
        if (!application) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        if (application.status !== "pending") return res.status(400).json({ message: "Đơn này đã được xử lý rồi" });

        application.status = "approved";
        application.adminNote = adminNote || "";
        application.reviewedBy = req.user._id;
        application.reviewedAt = new Date();
        await application.save();

        const now = new Date();
        await User.findByIdAndUpdate(application.user._id, {
            role: "seller",
            sellerStage: "PROBATION",
            "sellerInfo.shopName": application.shopName,
            "sellerInfo.registeredAt": now,
            "sellerInfo.lastStageChangedAt": now,
        });

        try {
            await sendEmail({
                to: application.user.email,
                subject: "🎉 Congratulations! Your seller application has been approved",
                template: "sellerApproved.ejs",
                data: {
                    username: application.user.username,
                    shopName: application.shopName,
                    adminNote: adminNote || "",
                },
            });
        } catch (emailErr) {
            console.error("Failed to send email:", emailErr.message);
        }

        await notificationService.sendNotification({
            recipientId: application.user._id,
            type: "seller_application_approved",
            title: "🎉 Congratulations! Your seller application has been approved!",
            body: `Shop "${application.shopName}" has been activated. You are now in the PROBATION stage (trial period). Start selling your products!`,
            link: "/seller",
            metadata: { shopName: application.shopName },
        });

        return res.status(200).json({ message: "Seller application approved successfully! You are now in the PROBATION stage (trial period). Start selling your products!", data: application });
    } catch (error) {
        next(error);
    }
};

// ─── Admin: từ chối đơn ───────────────────────────────────────────────────────
exports.rejectApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;

        const application = await SellerApplication.findById(id).populate("user");
        if (!application) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        if (application.status !== "pending") return res.status(400).json({ message: "Đơn này đã được xử lý rồi" });

        application.status = "rejected";
        application.adminNote = adminNote || "";
        application.reviewedBy = req.user._id;
        application.reviewedAt = new Date();
        await application.save();

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

        await notificationService.sendNotification({
            recipientId: application.user._id,
            type: "seller_application_rejected",
            title: "Đơn đăng ký Seller chưa được duyệt",
            body: `Đơn đăng ký shop "${application.shopName}" chưa được chấp thuận. ${adminNote ? "Lý do: " + adminNote : ""}`,
            link: "/become-seller",
            metadata: { shopName: application.shopName },
        });

        return res.status(200).json({ message: "Đã từ chối đơn", data: application });
    } catch (error) {
        next(error);
    }
};
