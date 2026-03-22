const Order = require("../models/Order");
const User = require("../models/User");
const notificationService = require("./notificationService");

const DEFAULT_MAX_ORDERS = 3;

/**
 * Tìm shipper phù hợp nhất để nhận đơn.
 * Ưu tiên shipper có ít đơn đang shipping nhất mà chưa đạt giới hạn.
 * @param {string|ObjectId|null} excludeShipperId - Shipper bị loại trừ (shipper cũ bị timeout)
 * @returns {Promise<Object|null>} shipper document hoặc null nếu tất cả đều đầy
 */
async function findBestShipper(excludeShipperId = null) {
    const query = {
        role: "shipper",
        status: "active",
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
    };

    // Loại trừ shipper cũ đã bị timeout để tránh gán lại ngay cho họ
    if (excludeShipperId) {
        query._id = { $ne: excludeShipperId };
    }

    const shippers = await User.find(query)
        .select("_id username shipperInfo")
        .lean();

    if (!shippers.length) return null;

    // Đếm số đơn đang shipping của từng shipper
    const shipperIds = shippers.map((s) => s._id);
    const counts = await Order.aggregate([
        { $match: { shipper: { $in: shipperIds }, status: { $in: ["shipping", "pending_acceptance"] } } },
        { $group: { _id: "$shipper", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    for (const c of counts) {
        countMap[c._id.toString()] = c.count;
    }

    // Lọc shipper còn slot và sắp xếp theo số đơn tăng dần (load balancing)
    const available = shippers.filter((s) => {
        const max = s.shipperInfo?.maxOrders ?? DEFAULT_MAX_ORDERS;
        const current = countMap[s._id.toString()] ?? 0;
        return current < max;
    });

    if (!available.length) return null;

    available.sort((a, b) => {
        const ca = countMap[a._id.toString()] ?? 0;
        const cb = countMap[b._id.toString()] ?? 0;
        return ca - cb;
    });

    return available[0];
}

/**
 * Tự động phân đơn cho shipper khi đơn chuyển sang ready_to_ship.
 * Nếu không có shipper rảnh thì đưa đơn vào queue (status: "queued").
 * @param {Object} order - Mongoose order document
 * @param {string|ObjectId|null} excludeShipperId - Shipper bị loại trừ (vừa bị timeout)
 */
async function autoAssignOrder(order, excludeShipperId = null) {
    const shipper = await findBestShipper(excludeShipperId);

    if (shipper) {
        // Atomic update: chỉ gán nếu đơn vẫn còn ở ready_to_ship và chưa có shipper
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: "ready_to_ship", shipper: null },
            {
                shipper: shipper._id,
                status: "pending_acceptance",
                queuedAt: null,
                $push: {
                    statusHistory: {
                        status: "pending_acceptance",
                        timestamp: new Date(),
                        note: `Auto-assigned to shipper ${shipper.username}, awaiting acceptance`,
                    },
                },
            },
            { new: true },
        );

        if (!updated) return; // Đơn đã bị nhận bởi thao tác khác, bỏ qua

        // Cập nhật trạng thái shipper sang shipping
        await User.findByIdAndUpdate(shipper._id, {
            "shipperInfo.shipperStatus": "shipping",
            "shipperInfo.isAvailable": false,
        }).catch(() => {});

        // Thông báo shipper được assign - yêu cầu chấp nhận
        notificationService
            .sendNotification({
                recipientId: shipper._id,
                type: "order_assigned",
                title: "New order waiting for your acceptance",
                body: `A new order has been assigned to you. Please accept or reject it.`,
                link: `/shipper/available`,
                metadata: { orderId: updated._id },
            })
            .catch(() => { });
    } else {
        // Không có shipper rảnh → đưa vào queue
        await Order.findOneAndUpdate(
            { _id: order._id, status: "ready_to_ship", shipper: null },
            {
                status: "queued",
                queuedAt: new Date(),
                $push: {
                    statusHistory: {
                        status: "queued",
                        timestamp: new Date(),
                        note: "All shippers are at full capacity. Order queued.",
                    },
                },
            },
        );
    }
}

/**
 * Sau khi shipper hoàn thành đơn, lấy đơn cũ nhất trong queue (FIFO)
 * và gán cho shipper đó nếu shipper còn slot.
 * @param {string|ObjectId} shipperId
 */
async function dispatchNextFromQueue(shipperId) {
    const shipper = await User.findById(shipperId)
        .select("_id username shipperInfo status")
        .lean();

    if (!shipper || shipper.status !== "active") return;
    if (shipper.shipperInfo?.shipperStatus !== "available") return;

    const max = shipper.shipperInfo?.maxOrders ?? DEFAULT_MAX_ORDERS;
    const activeCount = await Order.countDocuments({
        shipper: shipperId,
        status: { $in: ["shipping", "pending_acceptance"] },
    });

    if (activeCount >= max) return; // Vẫn đầy slot

    // Lấy đơn queued cũ nhất (FIFO theo queuedAt)
    const nextOrder = await Order.findOneAndUpdate(
        { status: "queued", shipper: null },
        {
            shipper: shipperId,
            status: "pending_acceptance",
            queuedAt: null,
            $push: {
                statusHistory: {
                    status: "pending_acceptance",
                    timestamp: new Date(),
                    note: `Auto-assigned from queue to shipper ${shipper.username}, awaiting acceptance`,
                },
            },
        },
        {
            sort: { queuedAt: 1 }, // FIFO
            new: true,
        },
    );

    if (!nextOrder) return; // Queue trống

    // Cập nhật trạng thái shipper sang shipping
    await User.findByIdAndUpdate(shipperId, {
        "shipperInfo.shipperStatus": "shipping",
        "shipperInfo.isAvailable": false,
    }).catch(() => {});

    // Thông báo shipper - yêu cầu chấp nhận
    notificationService
        .sendNotification({
            recipientId: shipperId,
            type: "order_assigned",
            title: "New order waiting for your acceptance",
            body: `A new order has been assigned to you. Please accept or reject it.`,
            link: `/shipper/available`,
            metadata: { orderId: nextOrder._id },
        })
        .catch(() => { });
}

/**
 * Toggle trạng thái available của shipper.
 * Khi bật lại (isAvailable = true), tự động dispatch đơn từ queue nếu còn slot.
 * @param {string|ObjectId} shipperId
 * @param {boolean} isAvailable
 */
async function toggleShipperAvailability(shipperId, isAvailable) {
    const updateFields = isAvailable
        ? { "shipperInfo.shipperStatus": "available", "shipperInfo.isAvailable": true }
        : { "shipperInfo.shipperStatus": "paused", "shipperInfo.isAvailable": false };

    const shipper = await User.findByIdAndUpdate(
        shipperId,
        updateFields,
        { new: true },
    ).select("_id username shipperInfo status");

    if (!shipper) throw new Error("Shipper not found");

    // Nếu vừa bật available, thử dispatch từ queue
    if (isAvailable) {
        setImmediate(() => dispatchNextFromQueue(shipperId).catch(() => { }));
    }

    return shipper;
}

module.exports = {
    autoAssignOrder,
    dispatchNextFromQueue,
    toggleShipperAvailability,
    findBestShipper,
};
