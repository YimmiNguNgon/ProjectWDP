const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protectedRoute } = require("../middleware/authMiddleware");

router.use(protectedRoute);

// Lấy danh sách thông báo của user hiện tại
router.get("/", async (req, res, next) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;
        const filter = { recipient: req.user._id };
        if (unreadOnly === "true") filter.isRead = false;

        const skip = (Number(page) - 1) * Number(limit);
        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient: req.user._id, isRead: false }),
        ]);

        return res.json({ data: notifications, total, unreadCount });
    } catch (err) {
        next(err);
    }
});

// Đánh dấu tất cả đã đọc - phải đặt TRƯỚC /:id/ để không bị match nhầm
router.patch("/read-all", async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );
        return res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// Đánh dấu 1 thông báo đã đọc
router.patch("/:id/read", async (req, res, next) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true }
        );
        return res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// Xóa 1 thông báo
router.delete("/:id", async (req, res, next) => {
    try {
        await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id,
        });
        return res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
