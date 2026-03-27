const Order = require("../models/Order");
const User = require("../models/User");
const notificationService = require("./notificationService");

const DEFAULT_MAX_ORDERS = 3;

/**
 * Truy vấn danh sách shipper available, tuỳ chọn lọc theo tỉnh/thành.
 * @param {string|ObjectId|null} excludeShipperId
 * @param {string|null} province - Nếu null thì không lọc theo tỉnh
 */
async function queryAvailableShippers(excludeShipperId, province) {
    const query = {
        role: "shipper",
        status: "active",
        "shipperInfo.shipperStatus": "available",
        "shipperInfo.isAvailable": true,
    };
    if (excludeShipperId) {
        query._id = { $ne: excludeShipperId };
    }
    if (province) {
        query["shipperInfo.assignedProvince"] = province;
    }
    return User.find(query)
        .select("_id username shipperInfo")
        .lean();
}

/**
 * Tìm shipper phù hợp nhất để nhận đơn.
 * Ưu tiên shipper phụ trách tỉnh/thành của đơn hàng.
 * Fallback: bất kỳ shipper available nào nếu không có shipper của tỉnh đó.
 * @param {string|ObjectId|null} excludeShipperId - Shipper bị loại trừ (shipper cũ bị timeout)
 * @param {string|null} province - Tỉnh/thành của địa chỉ giao hàng
 * @returns {Promise<Object|null>} shipper document hoặc null nếu tất cả đều đầy
 */
async function findBestShipper(excludeShipperId = null, province = null) {
    // Pass 1: tìm shipper cùng tỉnh (nếu có province)
    let shippers = province
        ? await queryAvailableShippers(excludeShipperId, province)
        : [];

    // Pass 2: fallback — bất kỳ shipper available nào trên toàn quốc
    if (!shippers.length) {
        shippers = await queryAvailableShippers(excludeShipperId, null);
    }

    if (!shippers.length) return null;

    // Đếm số đơn đang shipping của từng shipper
    const shipperIds = shippers.map((s) => s._id);
    const counts = await Order.aggregate([
        { $match: { shipper: { $in: shipperIds }, status: { $in: ["shipping", "pending_acceptance", "delivering", "pending_delivery_acceptance"] } } },
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
 * Tự động phân đơn cho Shipper 1 (pickup) khi đơn chuyển sang ready_to_ship.
 * Ưu tiên shipper phụ trách khu vực SELLER (shopAddress).
 * Nếu không có shipper rảnh thì đưa đơn vào queue (status: "queued").
 * @param {Object} order - Mongoose order document
 * @param {string|ObjectId|null} excludeShipperId - Shipper bị loại trừ (vừa bị timeout)
 */
async function autoAssignOrder(order, excludeShipperId = null) {
    // Ưu tiên khu vực seller (shopAddress), fallback về buyer city
    let sellerProvince = null;
    if (order.seller) {
        const sellerDoc = await User.findById(order.seller)
            .select("sellerInfo.shopAddress")
            .lean();
        sellerProvince = sellerDoc?.sellerInfo?.shopAddress || null;
    }
    const province = sellerProvince || order.shippingAddress?.city || null;

    const shipper = await findBestShipper(excludeShipperId, province);

    if (shipper) {
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
                        note: `Auto-assigned pickup to shipper ${shipper.username} (area: ${province || "any"}), awaiting acceptance`,
                    },
                },
            },
            { new: true },
        );

        if (!updated) return;

        await User.findByIdAndUpdate(shipper._id, {
            "shipperInfo.shipperStatus": "pending_acceptance",
            "shipperInfo.isAvailable": false,
        }).catch(() => {});

        notificationService
            .sendNotification({
                recipientId: shipper._id,
                type: "order_assigned",
                title: "New pickup order waiting for your acceptance",
                body: `A new order needs pickup. Please accept or reject it.`,
                link: `/shipper/available`,
                metadata: { orderId: updated._id },
            })
            .catch(() => { });
    } else {
        await Order.findOneAndUpdate(
            { _id: order._id, status: "ready_to_ship", shipper: null },
            {
                status: "queued",
                queuedAt: new Date(),
                $push: {
                    statusHistory: {
                        status: "queued",
                        timestamp: new Date(),
                        note: "All shippers in seller area are at full capacity. Order queued.",
                    },
                },
            },
        );
    }
}

/**
 * Tự động phân đơn cho Shipper 2 (delivery) khi Shipper 1 đến khu vực buyer.
 * Ưu tiên shipper phụ trách khu vực BUYER (shippingAddress.city).
 * Nếu không có shipper rảnh thì đưa đơn vào delivery_queued.
 * @param {Object} order - Mongoose order document (đang ở in_transit)
 * @param {string|ObjectId|null} excludeShipperId - Shipper 1 (bị loại trừ)
 */
async function autoAssignDeliveryShipper(order, excludeShipperId = null) {
    const province = order.shippingAddress?.city ?? null;
    const shipper = await findBestShipper(excludeShipperId, province);

    if (shipper) {
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: "in_transit", shipper: null },
            {
                shipper: shipper._id,
                status: "pending_delivery_acceptance",
                deliveryQueuedAt: null,
                $push: {
                    statusHistory: {
                        status: "pending_delivery_acceptance",
                        timestamp: new Date(),
                        note: `Auto-assigned delivery to shipper ${shipper.username} (area: ${province || "any"}), awaiting acceptance`,
                    },
                },
            },
            { new: true },
        );

        if (!updated) return;

        await User.findByIdAndUpdate(shipper._id, {
            "shipperInfo.shipperStatus": "pending_acceptance",
            "shipperInfo.isAvailable": false,
        }).catch(() => {});

        notificationService
            .sendNotification({
                recipientId: shipper._id,
                type: "order_assigned",
                title: "New delivery order waiting for your acceptance",
                body: `A package arrived in your area and needs delivery. Please accept or reject it.`,
                link: `/shipper/available`,
                metadata: { orderId: updated._id },
            })
            .catch(() => { });
    } else {
        await Order.findOneAndUpdate(
            { _id: order._id, status: "in_transit", shipper: null },
            {
                status: "delivery_queued",
                deliveryQueuedAt: new Date(),
                $push: {
                    statusHistory: {
                        status: "delivery_queued",
                        timestamp: new Date(),
                        note: `All shippers in buyer area (${province || "any"}) are at full capacity. Waiting for delivery shipper.`,
                    },
                },
            },
        );
    }
}

/**
 * Sau khi Shipper 2 hoàn thành đơn, lấy đơn delivery_queued cũ nhất (FIFO)
 * trong cùng tỉnh/thành của shipper và gán.
 * @param {string|ObjectId} shipperId
 */
async function dispatchNextDeliveryFromQueue(shipperId) {
    const shipper = await User.findById(shipperId)
        .select("_id username shipperInfo status")
        .lean();

    if (!shipper || shipper.status !== "active") return;
    if (shipper.shipperInfo?.shipperStatus !== "available") return;

    const max = shipper.shipperInfo?.maxOrders ?? DEFAULT_MAX_ORDERS;
    const activeCount = await Order.countDocuments({
        shipper: shipperId,
        status: { $in: ["delivering", "pending_delivery_acceptance"] },
    });

    if (activeCount >= max) return;

    const province = shipper.shipperInfo?.assignedProvince || null;

    const assignFields = {
        shipper: shipperId,
        status: "pending_delivery_acceptance",
        deliveryQueuedAt: null,
        $push: {
            statusHistory: {
                status: "pending_delivery_acceptance",
                timestamp: new Date(),
                note: `Auto-assigned delivery from queue to shipper ${shipper.username}, awaiting acceptance`,
            },
        },
    };

    const sortOpts = { sort: { deliveryQueuedAt: 1 }, new: true };

    let nextOrder = null;
    if (province) {
        nextOrder = await Order.findOneAndUpdate(
            { status: "delivery_queued", shipper: null, "shippingAddress.city": province },
            assignFields,
            sortOpts,
        );
    }

    if (!nextOrder) {
        nextOrder = await Order.findOneAndUpdate(
            { status: "delivery_queued", shipper: null },
            assignFields,
            sortOpts,
        );
    }

    if (!nextOrder) return;

    await User.findByIdAndUpdate(shipperId, {
        "shipperInfo.shipperStatus": "pending_acceptance",
        "shipperInfo.isAvailable": false,
    }).catch(() => {});

    notificationService
        .sendNotification({
            recipientId: shipperId,
            type: "order_assigned",
            title: "New delivery order waiting for your acceptance",
            body: `A queued package is ready for delivery in your area. Please accept or reject it.`,
            link: `/shipper/available`,
            metadata: { orderId: nextOrder._id },
        })
        .catch(() => { });
}

/**
 * Sau khi shipper hoàn thành đơn, lấy đơn cũ nhất trong queue (FIFO)
 * và gán cho shipper đó nếu shipper còn slot.
 * Ưu tiên đơn trong tỉnh phụ trách của shipper, fallback sang đơn bất kỳ.
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
        status: { $in: ["shipping", "pending_acceptance", "delivering", "pending_delivery_acceptance"] },
    });

    if (activeCount >= max) return; // Vẫn đầy slot

    const province = shipper.shipperInfo?.assignedProvince || null;

    const assignFields = {
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
    };

    const sortOpts = { sort: { queuedAt: 1 }, new: true }; // FIFO

    // Pass 1: lấy đơn queued trong tỉnh phụ trách
    let nextOrder = null;
    if (province) {
        nextOrder = await Order.findOneAndUpdate(
            { status: "queued", shipper: null, "shippingAddress.city": province },
            assignFields,
            sortOpts,
        );
    }

    // Pass 2: fallback — đơn queued bất kỳ
    if (!nextOrder) {
        nextOrder = await Order.findOneAndUpdate(
            { status: "queued", shipper: null },
            assignFields,
            sortOpts,
        );
    }

    if (!nextOrder) return; // Queue trống

    // Cập nhật trạng thái shipper sang pending_acceptance
    await User.findByIdAndUpdate(shipperId, {
        "shipperInfo.shipperStatus": "pending_acceptance",
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
 * Tự động phân đơn cho Return Shipper 2 (delivery về seller) khi Return Shipper 1 đến khu vực seller.
 * Ưu tiên shipper phụ trách khu vực SELLER (sellerCity).
 * Nếu không có shipper rảnh thì đưa đơn vào return_delivery_queued.
 * @param {Object} order - Mongoose order document (đang ở return_in_transit)
 * @param {string|ObjectId|null} excludeShipperId - Return Shipper 1 (bị loại trừ)
 */
async function autoAssignReturnDeliveryShipper(order, excludeShipperId = null) {
    const province = order.sellerCity || null;
    const shipper = await findBestShipper(excludeShipperId, province);

    if (shipper) {
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: "return_in_transit", returnShipper: null },
            {
                returnShipper: shipper._id,
                status: "return_pending_delivery_acceptance",
                returnDeliveryQueuedAt: null,
                $push: {
                    statusHistory: {
                        status: "return_pending_delivery_acceptance",
                        timestamp: new Date(),
                        note: `Auto-assigned return delivery to shipper ${shipper.username} (area: ${province || "any"}), awaiting acceptance`,
                    },
                },
            },
            { new: true },
        );

        if (!updated) return;

        await User.findByIdAndUpdate(shipper._id, {
            "shipperInfo.shipperStatus": "pending_acceptance",
            "shipperInfo.isAvailable": false,
        }).catch(() => {});

        notificationService
            .sendNotification({
                recipientId: shipper._id,
                type: "order_assigned",
                title: "New return delivery waiting for your acceptance",
                body: `A return package arrived in your area and needs delivery to seller. Please accept or reject it.`,
                link: `/shipper/available`,
                metadata: { orderId: updated._id },
            })
            .catch(() => { });
    } else {
        await Order.findOneAndUpdate(
            { _id: order._id, status: "return_in_transit", returnShipper: null },
            {
                status: "return_delivery_queued",
                returnDeliveryQueuedAt: new Date(),
                $push: {
                    statusHistory: {
                        status: "return_delivery_queued",
                        timestamp: new Date(),
                        note: `All shippers in seller area (${province || "any"}) are at full capacity. Waiting for return delivery shipper.`,
                    },
                },
            },
        );
    }
}

/**
 * Sau khi Return Shipper 2 hoàn thành đơn, lấy đơn return_delivery_queued cũ nhất (FIFO)
 * trong cùng tỉnh/thành của shipper và gán.
 * @param {string|ObjectId} shipperId
 */
async function dispatchNextReturnDeliveryFromQueue(shipperId) {
    const shipper = await User.findById(shipperId)
        .select("_id username shipperInfo status")
        .lean();

    if (!shipper || shipper.status !== "active") return;
    if (shipper.shipperInfo?.shipperStatus !== "available") return;

    const max = shipper.shipperInfo?.maxOrders ?? DEFAULT_MAX_ORDERS;
    const activeCount = await Order.countDocuments({
        returnShipper: shipperId,
        status: { $in: ["return_shipping", "return_delivering", "return_pending_delivery_acceptance"] },
    });

    if (activeCount >= max) return;

    const province = shipper.shipperInfo?.assignedProvince || null;

    const assignFields = {
        returnShipper: shipperId,
        status: "return_pending_delivery_acceptance",
        returnDeliveryQueuedAt: null,
        $push: {
            statusHistory: {
                status: "return_pending_delivery_acceptance",
                timestamp: new Date(),
                note: `Auto-assigned return delivery from queue to shipper ${shipper.username}, awaiting acceptance`,
            },
        },
    };

    const sortOpts = { sort: { returnDeliveryQueuedAt: 1 }, new: true };

    let nextOrder = null;
    if (province) {
        nextOrder = await Order.findOneAndUpdate(
            { status: "return_delivery_queued", returnShipper: null, sellerCity: province },
            assignFields,
            sortOpts,
        );
    }

    if (!nextOrder) {
        nextOrder = await Order.findOneAndUpdate(
            { status: "return_delivery_queued", returnShipper: null },
            assignFields,
            sortOpts,
        );
    }

    if (!nextOrder) return;

    await User.findByIdAndUpdate(shipperId, {
        "shipperInfo.shipperStatus": "pending_acceptance",
        "shipperInfo.isAvailable": false,
    }).catch(() => {});

    notificationService
        .sendNotification({
            recipientId: shipperId,
            type: "order_assigned",
            title: "New return delivery waiting for your acceptance",
            body: `A queued return package is ready for delivery to seller in your area. Please accept or reject it.`,
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
        : { "shipperInfo.isAvailable": false };

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
    autoAssignDeliveryShipper,
    autoAssignReturnDeliveryShipper,
    dispatchNextFromQueue,
    dispatchNextDeliveryFromQueue,
    dispatchNextReturnDeliveryFromQueue,
    toggleShipperAvailability,
    findBestShipper,
};
