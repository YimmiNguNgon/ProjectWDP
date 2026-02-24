const Notification = require("../models/Notification");

// io instance được set từ server.js
let _io = null;

function setIO(io) {
    _io = io;
}

/**
 * Tạo notification, lưu DB và push realtime qua socket
 * @param {Object} opts
 * @param {string} opts.recipientId - userId nhận thông báo
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} [opts.link]
 * @param {Object} [opts.metadata]
 */
async function sendNotification({ recipientId, type, title, body, link = "", metadata = {} }) {
    try {
        const notification = await Notification.create({
            recipient: recipientId,
            type,
            title,
            body,
            link,
            metadata,
        });

        // Push realtime nếu IO sẵn sàng
        if (_io) {
            _io.to(`user_${recipientId}`).emit("notification", {
                _id: notification._id,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                link: notification.link,
                isRead: false,
                createdAt: notification.createdAt,
                metadata,
            });
        }

        return notification;
    } catch (err) {
        console.error("notificationService error:", err.message);
    }
}

/**
 * Gửi broadcast tới nhiều user
 */
async function sendBroadcast({ recipientIds, type, title, body, link = "", metadata = {} }) {
    const results = await Promise.allSettled(
        recipientIds.map((id) => sendNotification({ recipientId: id, type, title, body, link, metadata }))
    );
    return results;
}

module.exports = { setIO, sendNotification, sendBroadcast };
