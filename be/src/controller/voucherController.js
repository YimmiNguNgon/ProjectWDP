const Voucher = require("../models/Voucher");
const VoucherRequest = require("../models/VoucherRequest");

const getUserId = (req) => req.user?._id || req.user?.userId;
const toUpperCode = (code = "") => String(code).trim().toUpperCase();

const calculateDiscount = (voucher, totalAmount) => {
  if (totalAmount <= 0) return 0;

  let discount =
    voucher.type === "percentage"
      ? (totalAmount * voucher.value) / 100
      : voucher.value;

  if (
    voucher.type === "percentage" &&
    typeof voucher.maxDiscountAmount === "number"
  ) {
    discount = Math.min(discount, voucher.maxDiscountAmount);
  }

  discount = Math.max(0, Math.min(discount, totalAmount));
  return Number(discount.toFixed(2));
};

const validateVoucherForUser = (voucher, userId, totalAmount) => {
  const now = new Date();

  if (!voucher || !voucher.isActive) {
    return { ok: false, message: "Voucher is invalid or inactive" };
  }

  if (voucher.startDate && now < voucher.startDate) {
    return { ok: false, message: "Voucher is not active yet" };
  }

  if (voucher.endDate && now > voucher.endDate) {
    return { ok: false, message: "Voucher has expired" };
  }

  if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
    return { ok: false, message: "Voucher usage limit reached" };
  }

  if (totalAmount < (voucher.minOrderValue || 0)) {
    return {
      ok: false,
      message: `Minimum order value is ${voucher.minOrderValue}`,
    };
  }

  const userUsageCount = voucher.usedBy.filter(
    (usage) => usage.user.toString() === userId.toString(),
  ).length;

  if (voucher.perUserLimit && userUsageCount >= voucher.perUserLimit) {
    return { ok: false, message: "You have reached this voucher usage limit" };
  }

  const discountAmount = calculateDiscount(voucher, totalAmount);
  return { ok: true, discountAmount };
};

const markVoucherAsUsed = async (voucher, userId, orderId) => {
  voucher.usedCount += 1;
  voucher.usedBy.push({
    user: userId,
    order: orderId || null,
    usedAt: new Date(),
  });
  await voucher.save();
};

const validateVoucherPayload = (payload) => {
  const { code, type, value, endDate } = payload;

  if (!code || !type || value === undefined || !endDate) {
    return "code, type, value, endDate are required";
  }

  if (!["percentage", "fixed"].includes(type)) {
    return "type must be percentage or fixed";
  }

  if (Number(value) <= 0) {
    return "value must be greater than 0";
  }

  if (type === "percentage" && Number(value) > 100) {
    return "percentage voucher cannot exceed 100";
  }

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) {
    return "endDate is invalid";
  }

  return null;
};

const mapVoucherFields = (payload) => ({
  code: toUpperCode(payload.code),
  type: payload.type,
  value: Number(payload.value),
  minOrderValue: Number(payload.minOrderValue) || 0,
  maxDiscountAmount:
    payload.maxDiscountAmount !== null && payload.maxDiscountAmount !== undefined
      ? Number(payload.maxDiscountAmount)
      : null,
  usageLimit:
    payload.usageLimit !== null && payload.usageLimit !== undefined
      ? Number(payload.usageLimit)
      : null,
  perUserLimit: Number(payload.perUserLimit) || 1,
  startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
  endDate: new Date(payload.endDate),
});

const requestVoucher = async (req, res) => {
  try {
    const sellerId = getUserId(req);
    if (req.user?.role !== "seller") {
      return res
        .status(403)
        .json({ success: false, message: "Seller access required" });
    }

    const validationMessage = validateVoucherPayload(req.body);
    if (validationMessage) {
      return res
        .status(400)
        .json({ success: false, message: validationMessage });
    }

    const code = toUpperCode(req.body.code);

    const conflict = await Promise.all([
      Voucher.findOne({ code }),
      VoucherRequest.findOne({ code, status: "pending" }),
    ]);

    if (conflict[0] || conflict[1]) {
      return res.status(409).json({
        success: false,
        message: "Voucher code already exists or is awaiting approval",
      });
    }

    const request = await VoucherRequest.create({
      seller: sellerId,
      ...mapVoucherFields(req.body),
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Voucher request submitted",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit voucher request",
      error: error.message,
    });
  }
};

const getMyVoucherRequests = async (req, res) => {
  try {
    const sellerId = getUserId(req);
    const { status } = req.query;
    const filter = { seller: sellerId };
    if (status) filter.status = status;

    const requests = await VoucherRequest.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get voucher requests",
      error: error.message,
    });
  }
};

const cancelVoucherRequest = async (req, res) => {
  try {
    const sellerId = getUserId(req);
    const { id } = req.params;

    const request = await VoucherRequest.findById(id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher request not found" });
    }

    if (request.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });
    }

    request.status = "cancelled";
    await request.save();

    return res.json({
      success: true,
      message: "Voucher request cancelled",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel voucher request",
      error: error.message,
    });
  }
};

const getAdminVoucherRequests = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      VoucherRequest.find(filter)
        .populate("seller", "username email")
        .populate("reviewedBy", "username")
        .populate("voucher", "code isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      VoucherRequest.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get voucher requests",
      error: error.message,
    });
  }
};

const approveVoucherRequest = async (req, res) => {
  try {
    const adminId = getUserId(req);
    const { id } = req.params;
    const { adminNotes = "" } = req.body;

    const request = await VoucherRequest.findById(id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be approved",
      });
    }

    const existedVoucher = await Voucher.findOne({ code: request.code });
    if (existedVoucher) {
      return res.status(409).json({
        success: false,
        message: "Voucher code already exists",
      });
    }

    const voucher = await Voucher.create({
      seller: request.seller,
      code: request.code,
      type: request.type,
      value: request.value,
      minOrderValue: request.minOrderValue,
      maxDiscountAmount: request.maxDiscountAmount,
      usageLimit: request.usageLimit,
      perUserLimit: request.perUserLimit,
      startDate: request.startDate,
      endDate: request.endDate,
      isActive: true,
      createdBy: adminId,
      createdFromRequest: request._id,
    });

    request.status = "approved";
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes;
    request.voucher = voucher._id;
    await request.save();

    return res.json({
      success: true,
      message: "Voucher request approved",
      data: { request, voucher },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve voucher request",
      error: error.message,
    });
  }
};

const rejectVoucherRequest = async (req, res) => {
  try {
    const adminId = getUserId(req);
    const { id } = req.params;
    const { rejectionReason = "", adminNotes = "" } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "rejectionReason is required",
      });
    }

    const request = await VoucherRequest.findById(id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be rejected",
      });
    }

    request.status = "rejected";
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.adminNotes = adminNotes;
    await request.save();

    return res.json({
      success: true,
      message: "Voucher request rejected",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject voucher request",
      error: error.message,
    });
  }
};

const getMyVouchers = async (req, res) => {
  try {
    const sellerId = getUserId(req);
    const { isActive } = req.query;
    const filter = { seller: sellerId };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const vouchers = await Voucher.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, data: vouchers });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get vouchers",
      error: error.message,
    });
  }
};

const setMyVoucherStatus = async (req, res) => {
  try {
    const sellerId = getUserId(req);
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive must be boolean" });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    if (voucher.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    voucher.isActive = isActive;
    await voucher.save();

    return res.json({
      success: true,
      message: "Voucher status updated",
      data: voucher,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update voucher status",
      error: error.message,
    });
  }
};

const validateVoucher = async (req, res) => {
  try {
    const { code, totalAmount, sellerId } = req.body;
    const userId = getUserId(req);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Voucher code is required",
      });
    }

    const amount = Number(totalAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "totalAmount must be greater than 0",
      });
    }

    const filter = { code: toUpperCode(code) };
    if (sellerId) filter.seller = sellerId;

    const voucher = await Voucher.findOne(filter);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    const validation = validateVoucherForUser(voucher, userId, amount);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const finalAmount = Number((amount - validation.discountAmount).toFixed(2));
    return res.json({
      success: true,
      message: "Voucher is valid",
      data: {
        voucherId: voucher._id,
        sellerId: voucher.seller,
        voucherCode: voucher.code,
        discountAmount: validation.discountAmount,
        finalAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate voucher",
      error: error.message,
    });
  }
};

module.exports = {
  requestVoucher,
  getMyVoucherRequests,
  cancelVoucherRequest,
  getAdminVoucherRequests,
  approveVoucherRequest,
  rejectVoucherRequest,
  getMyVouchers,
  setMyVoucherStatus,
  validateVoucher,
  validateVoucherForUser,
  markVoucherAsUsed,
};
