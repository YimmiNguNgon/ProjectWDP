const Voucher = require("../models/Voucher");
const VoucherRequest = require("../models/VoucherRequest");

const getUserId = (req) => req.user?._id || req.user?.userId;
const toUpperCode = (code = "") => String(code).trim().toUpperCase();

const parseNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const normalizeVoucherScope = (voucher) => voucher?.scope || "seller";

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

const hasUserClaimedVoucher = (voucher, userId) =>
  (voucher.claimedBy || []).some(
    (claim) => claim.user?.toString() === userId?.toString(),
  );

const getUserUsageCount = (voucher, userId) =>
  (voucher.usedBy || []).filter(
    (usage) => usage.user?.toString() === userId?.toString(),
  ).length;

const validateVoucherForUser = (
  voucher,
  userId,
  totalAmount,
  options = {},
) => {
  const now = new Date();
  const scope = normalizeVoucherScope(voucher);
  const {
    sellerId,
    scope: requestedScope,
    ignoreMinOrder = false,
    ignoreScope = false,
  } = options;

  if (!voucher || !voucher.isActive) {
    return { ok: false, message: "Voucher is invalid or inactive" };
  }

  if (!ignoreScope && requestedScope && requestedScope !== scope) {
    return { ok: false, message: "Voucher scope does not match" };
  }

  if (scope === "seller") {
    if (!sellerId) {
      return {
        ok: false,
        message: "Seller voucher requires sellerId",
      };
    }
    if (voucher.seller?.toString() !== sellerId.toString()) {
      return {
        ok: false,
        message: "Voucher does not belong to this seller",
      };
    }
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

  if (!ignoreMinOrder && totalAmount < (voucher.minOrderValue || 0)) {
    return {
      ok: false,
      message: `Minimum order value is ${voucher.minOrderValue}`,
    };
  }

  const userUsageCount = getUserUsageCount(voucher, userId);

  if (voucher.perUserLimit && userUsageCount >= voucher.perUserLimit) {
    return { ok: false, message: "You have reached this voucher usage limit" };
  }

  const discountAmount = calculateDiscount(voucher, totalAmount);
  return { ok: true, discountAmount, userUsageCount };
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
  usageLimit: parseNullableNumber(payload.usageLimit),
  perUserLimit: Number(payload.perUserLimit) || 1,
  startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
  endDate: new Date(payload.endDate),
});

const mapVoucherForResponse = (voucher, userId, totalAmount = null) => {
  const userUsageCount = getUserUsageCount(voucher, userId);
  const usageLimit = voucher.usageLimit ?? null;
  const remainingUsage =
    usageLimit === null ? null : Math.max(0, usageLimit - (voucher.usedCount || 0));
  const remainingForUser = Math.max(
    0,
    Number(voucher.perUserLimit || 1) - Number(userUsageCount || 0),
  );

  const mapped = {
    _id: voucher._id,
    code: voucher.code,
    scope: normalizeVoucherScope(voucher),
    seller: voucher.seller ? voucher.seller._id || voucher.seller : null,
    sellerName:
      typeof voucher.seller === "object"
        ? voucher.seller?.sellerInfo?.shopName || voucher.seller?.username || ""
        : "",
    type: voucher.type,
    value: voucher.value,
    minOrderValue: voucher.minOrderValue || 0,
    maxDiscountAmount: voucher.maxDiscountAmount ?? null,
    usageLimit,
    usedCount: voucher.usedCount || 0,
    perUserLimit: voucher.perUserLimit || 1,
    remainingUsage,
    remainingForUser,
    startDate: voucher.startDate,
    endDate: voucher.endDate,
    isActive: voucher.isActive,
    isClaimable: Boolean(voucher.isClaimable),
  };

  if (typeof totalAmount === "number" && totalAmount > 0) {
    mapped.estimatedDiscount = calculateDiscount(voucher, totalAmount);
  }

  return mapped;
};

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
      scope: "seller",
      source: "seller_request",
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
      isClaimable: false,
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
    const filter = { seller: sellerId, scope: "seller" };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const vouchers = await Voucher.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: vouchers.map((voucher) => mapVoucherForResponse(voucher, sellerId)),
    });
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

    if (
      normalizeVoucherScope(voucher) !== "seller" ||
      voucher.seller?.toString() !== sellerId.toString()
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    voucher.isActive = isActive;
    await voucher.save();

    return res.json({
      success: true,
      message: "Voucher status updated",
      data: mapVoucherForResponse(voucher, sellerId),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update voucher status",
      error: error.message,
    });
  }
};

const createAdminGlobalVoucher = async (req, res) => {
  try {
    const adminId = getUserId(req);
    const validationMessage = validateVoucherPayload(req.body);
    if (validationMessage) {
      return res
        .status(400)
        .json({ success: false, message: validationMessage });
    }

    const code = toUpperCode(req.body.code);
    const [existingVoucher, pendingRequest] = await Promise.all([
      Voucher.findOne({ code }),
      VoucherRequest.findOne({ code, status: "pending" }),
    ]);

    if (existingVoucher || pendingRequest) {
      return res.status(409).json({
        success: false,
        message: "Voucher code already exists or is awaiting approval",
      });
    }

    const voucher = await Voucher.create({
      ...mapVoucherFields(req.body),
      scope: "global",
      seller: null,
      source: "admin_created",
      isClaimable: false,
      isActive: true,
      createdBy: adminId,
      createdFromRequest: null,
    });

    return res.status(201).json({
      success: true,
      message: "Global voucher created",
      data: mapVoucherForResponse(voucher, adminId),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create global voucher",
      error: error.message,
    });
  }
};

const getAdminGlobalVouchers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { isActive } = req.query;
    const filter = { scope: "global" };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const vouchers = await Voucher.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: vouchers.map((voucher) => mapVoucherForResponse(voucher, userId)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get global vouchers",
      error: error.message,
    });
  }
};

const setAdminGlobalVoucherStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive must be boolean" });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher || normalizeVoucherScope(voucher) !== "global") {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    voucher.isActive = isActive;
    await voucher.save();

    return res.json({
      success: true,
      message: "Global voucher status updated",
      data: mapVoucherForResponse(voucher, userId),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update global voucher status",
      error: error.message,
    });
  }
};

const claimVoucher = async (req, res) => {
  try {
    const userId = getUserId(req);
    const code = toUpperCode(req.body?.code);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Voucher code is required",
      });
    }

    const voucher = await Voucher.findOne({ code });
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    const validation = validateVoucherForUser(voucher, userId, 1, {
      ignoreMinOrder: true,
      ignoreScope: true,
      sellerId: voucher.seller?._id || voucher.seller || undefined,
    });
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const alreadyClaimed = hasUserClaimedVoucher(voucher, userId);
    if (alreadyClaimed) {
      return res.json({
        success: true,
        message: "Voucher is already in your wallet",
        data: mapVoucherForResponse(voucher, userId),
      });
    }

    voucher.claimedBy.push({ user: userId, claimedAt: new Date() });
    await voucher.save();

    return res.json({
      success: true,
      message: "Voucher claimed successfully",
      data: mapVoucherForResponse(voucher, userId),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to claim voucher",
      error: error.message,
    });
  }
};

const getMyVoucherWallet = async (req, res) => {
  try {
    const userId = getUserId(req);
    const vouchers = await Voucher.find({ "claimedBy.user": userId })
      .populate("seller", "username sellerInfo.shopName")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: vouchers.map((voucher) => mapVoucherForResponse(voucher, userId)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get voucher wallet",
      error: error.message,
    });
  }
};

const getAvailableVouchers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const scope = String(req.query.scope || "all").toLowerCase();
    const sellerId = req.query.sellerId;
    const subtotal = parseNullableNumber(req.query.subtotal);

    const filter = { isActive: true };
    if (["global", "seller"].includes(scope)) {
      filter.scope = scope;
    }
    if (scope === "seller" && !sellerId) {
      return res.status(400).json({
        success: false,
        message: "sellerId is required for seller voucher lookup",
      });
    }
    if (sellerId) {
      filter.seller = sellerId;
    }

    const vouchers = await Voucher.find(filter)
      .populate("seller", "username sellerInfo.shopName")
      .sort({ createdAt: -1 });

    const amountToCheck = typeof subtotal === "number" && subtotal > 0 ? subtotal : 0;
    const withEligibility = vouchers.map((voucher) => {
      const voucherScope = normalizeVoucherScope(voucher);
      const allowAnySellerInAllScope =
        !sellerId && scope !== "seller" && voucherScope === "seller";
      const validation = validateVoucherForUser(voucher, userId, amountToCheck, {
        sellerId: allowAnySellerInAllScope
          ? voucher.seller?._id || voucher.seller
          : sellerId,
        ignoreMinOrder: !(typeof subtotal === "number" && subtotal > 0),
      });
      return {
        voucher,
        validation,
      };
    });

    const filtered = withEligibility
      .filter(({ validation }) => validation.ok)
      .map(({ voucher }) => mapVoucherForResponse(voucher, userId, amountToCheck || null));

    return res.json({ success: true, data: filtered });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get available vouchers",
      error: error.message,
    });
  }
};

const validateVoucher = async (req, res) => {
  try {
    const { code, totalAmount, sellerId, scope } = req.body;
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
    if (["global", "seller"].includes(scope)) {
      filter.scope = scope;
    }
    const voucher = await Voucher.findOne(filter).populate(
      "seller",
      "username sellerInfo.shopName",
    );
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    const validation = validateVoucherForUser(voucher, userId, amount, {
      sellerId,
      scope,
    });
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
        sellerId: voucher.seller?._id || voucher.seller || null,
        sellerName:
          voucher.seller?.sellerInfo?.shopName || voucher.seller?.username || "",
        voucherCode: voucher.code,
        scope: normalizeVoucherScope(voucher),
        discountAmount: validation.discountAmount,
        finalAmount,
        usageLimit: voucher.usageLimit ?? null,
        usedCount: voucher.usedCount || 0,
        remainingUsage:
          voucher.usageLimit === null || voucher.usageLimit === undefined
            ? null
            : Math.max(0, voucher.usageLimit - (voucher.usedCount || 0)),
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
  createAdminGlobalVoucher,
  getAdminGlobalVouchers,
  setAdminGlobalVoucherStatus,
  claimVoucher,
  getMyVoucherWallet,
  getAvailableVouchers,
  validateVoucher,
  validateVoucherForUser,
  markVoucherAsUsed,
  calculateDiscount,
  mapVoucherForResponse,
};
