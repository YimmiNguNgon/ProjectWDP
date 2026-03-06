const AuditLog = require("../models/AuditLog");
const mongoose = require("mongoose");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      actorRole,
      actorId,
      resourceType,
      action,
      statusCode,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (actorRole) filter.actorRole = String(actorRole).trim();
    if (actorId) {
      const normalizedActorId = String(actorId).trim();
      if (!mongoose.isValidObjectId(normalizedActorId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid actorId",
        });
      }
      filter.actorId = normalizedActorId;
    }
    if (resourceType) filter.resourceType = String(resourceType).trim();
    if (action) filter.action = String(action).trim();

    if (statusCode !== undefined && statusCode !== null && statusCode !== "") {
      const parsedStatusCode = parseInt(statusCode, 10);
      if (!Number.isNaN(parsedStatusCode)) {
        filter.statusCode = parsedStatusCode;
      }
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(String(dateFrom));
        if (!Number.isNaN(fromDate.getTime())) {
          filter.createdAt.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(String(dateTo));
        if (!Number.isNaN(toDate.getTime())) {
          filter.createdAt.$lte = toDate;
        }
      }
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    if (search) {
      const pattern = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [
        { actorUsername: pattern },
        { path: pattern },
        { resourceId: pattern },
        { action: pattern },
        { resourceType: pattern },
      ];
    }

    const [rows, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const data = rows.map((row) => ({
      _id: row._id,
      actorId: row.actorId || null,
      actorRole: row.actorRole || "",
      actorUsername: row.actorUsername || "",
      action: row.action || "",
      resourceType: row.resourceType || "",
      resourceId: row.resourceId || "",
      method: row.method || "",
      path: row.path || "",
      statusCode: Number(row.statusCode || 0),
      success: Boolean(row.success),
      ip: row.ip || "",
      durationMs: Number(row.durationMs || 0),
      createdAt: row.createdAt,
    }));

    return res.json({
      success: true,
      data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit log id",
      });
    }
    const log = await AuditLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }
    return res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
