const Order = require("../models/Order");

// Helper function để format date
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Lấy tất cả orders với format mới
getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("buyer", "name email") // Giả sử User model có trường name và email
      .populate("seller", "name")
      .populate("items.productId", "title")
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => {
      // Tính tổng số items
      const totalItems = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      // Lấy payment method (cần thêm vào model nếu chưa có)
      // Tạm thời dùng mặc định hoặc từ data khác
      const paymentMethod = order.paymentMethod || "Credit Card"; // Giả sử có trường này

      return {
        _id: order._id, // Hoặc có thể tạo orderId format như #ORD001
        // Nếu muốn format _id thành #ORD001:
        // _id: `#ORD${String(order._id).slice(-6).toUpperCase()}`,
        customer: order.buyer?.name || "Khách hàng",
        email: order.buyer?.email || "",
        total: order.totalAmount,
        status: order.status,
        items: order.items, // Return the actual items array
        itemCount: totalItems, // Số lượng items (tổng quantity)
        date: formatDate(order.createdAt),
        paymentMethod: paymentMethod,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedOrders,
      total: formattedOrders.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

// Lấy order theo ID với format mới
getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email phone address")
      .populate("seller", "name email phone")
      .populate("items.productId", "title images");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Tính tổng số items
    const totalItems = order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // Lấy payment method
    const paymentMethod = order.paymentMethod || "Credit Card";

    const formattedOrder = {
      _id: order._id,
      orderId: `#ORD${String(order._id).slice(-6).toUpperCase()}`, // Tạo orderId đẹp
      customer: order.buyer?.name || "Khách hàng",
      email: order.buyer?.email || "",
      phone: order.buyer?.phone || "",
      address: order.buyer?.address || "",
      seller: order.seller?.name || "",
      totalAmount: order.totalAmount,
      status: order.status,
      items: totalItems,
      date: formatDate(order.createdAt),
      paymentMethod: paymentMethod,
      orderDetails: order.items.map((item) => ({
        productId: item.productId?._id,
        productName: item.productId?.title || item.title || "Sản phẩm",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin đơn hàng",
      error: error.message,
    });
  }
};

// Lấy orders với filter và pagination
getOrders = async (req, res) => {
  try {
    const {
      status,
      customer,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter query
    let filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (customer) {
      // Tìm theo tên customer thông qua populate
      // Cần query phức tạp hơn nếu muốn filter theo tên
      // Tạm thời bỏ qua filter này hoặc implement sau
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Tính phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query với populate và filter
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyer", "name email")
        .populate("seller", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    // Format orders
    const formattedOrders = orders.map((order) => {
      const totalItems = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const paymentMethod = order.paymentMethod || "Credit Card";

      return {
        _id: order._id,
        orderId: `#ORD${String(order._id).slice(-6).toUpperCase()}`,
        customer: order.buyer?.name || "Khách hàng",
        email: order.buyer?.email || "",
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items, // Return the actual items array
        itemCount: totalItems,
        date: formatDate(order.createdAt),
        paymentMethod: paymentMethod,
        createdAt: order.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

// Thống kê orders
getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrders,
  getOrderStats,
};
