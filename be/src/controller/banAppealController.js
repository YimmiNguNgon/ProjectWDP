const mongoose = require("mongoose");
const BanAppeal = require("../models/BanAppeal");
const User = require("../models/User");
const notificationService = require("../services/notificationService");
const sendEmail = require("../utils/sendEmail");
const { hashBanAppealToken } = require("../utils/banAppealToken");

const canSendEmail = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

const safeSendEmail = async ({ to, subject, template, data }) => {
  if (!canSendEmail()) return;
  try {
    await sendEmail({ to, subject, template, data });
  } catch (error) {
    console.error("[BanAppeal] Failed to send email:", error.message);
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token || String(token).trim().length < 16) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const tokenHash = hashBanAppealToken(token);
    const user = await User.findOne({
      status: "banned",
      banAppealTokenHash: tokenHash,
      banAppealTokenExpires: { $gt: new Date() },
    })
      .select("username banReason")
      .lean();

    if (!user) {
      return res.status(400).json({
        message: "Appeal link is invalid or expired",
      });
    }

    const pendingAppeal = await BanAppeal.findOne({
      userId: user._id,
      status: "pending",
    })
      .select("_id createdAt")
      .lean();

    return res.json({
      success: true,
      data: {
        username: user.username,
        banReason: user.banReason || "",
        hasPendingAppeal: Boolean(pendingAppeal),
        pendingAppeal,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.submitAppeal = async (req, res, next) => {
  try {
    const { token, reason } = req.body;
    if (!token || String(token).trim().length < 16) {
      return res.status(400).json({ message: "Invalid token" });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Appeal reason is required" });
    }

    const tokenHash = hashBanAppealToken(token);
    const user = await User.findOne({
      status: "banned",
      banAppealTokenHash: tokenHash,
      banAppealTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Appeal link is invalid or expired",
      });
    }

    const existingPending = await BanAppeal.findOne({
      userId: user._id,
      status: "pending",
    }).lean();
    if (existingPending) {
      return res.status(409).json({
        message: "You already have a pending appeal. Please wait for admin review.",
      });
    }

    const appeal = await BanAppeal.create({
      userId: user._id,
      banReasonSnapshot: user.banReason || "",
      appealReason: String(reason).trim(),
      status: "pending",
    });

    // Make the link single-use.
    user.banAppealTokenHash = null;
    user.banAppealTokenExpires = null;
    await user.save();

    const admins = await User.find({ role: "admin", status: "active" })
      .select("_id")
      .lean();
    if (admins.length > 0) {
      await notificationService.sendBroadcast({
        recipientIds: admins.map((admin) => admin._id),
        type: "ban_appeal_submitted",
        title: "New account appeal",
        body: `${user.username} submitted a ban appeal`,
        link: "/admin/users",
        metadata: {
          appealId: appeal._id.toString(),
          userId: user._id.toString(),
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Appeal submitted successfully",
      data: {
        id: appeal._id,
        status: appeal.status,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "You already have a pending appeal. Please wait for admin review.",
      });
    }
    return next(err);
  }
};

exports.getAllAppeals = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const status = String(req.query.status || "pending").trim();
    const query = {};
    if (status && status !== "all") query.status = status;

    const [rows, total] = await Promise.all([
      BanAppeal.find(query)
        .populate("userId", "username email status banReason bannedAt")
        .populate("reviewedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BanAppeal.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.reviewAppeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid appeal id" });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const appeal = await BanAppeal.findById(id);
    if (!appeal) {
      return res.status(404).json({ message: "Appeal not found" });
    }
    if (appeal.status !== "pending") {
      return res.status(400).json({ message: "Appeal has already been reviewed" });
    }

    const user = await User.findById(appeal.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();
    appeal.status = action === "approve" ? "approved" : "rejected";
    appeal.reviewedBy = req.user._id;
    appeal.reviewedAt = now;
    appeal.reviewNote = String(note || "").trim();
    await appeal.save();

    if (action === "approve") {
      user.status = "active";
      user.bannedAt = null;
      user.bannedBy = null;
      user.banReason = null;
      user.banAppealTokenHash = null;
      user.banAppealTokenExpires = null;
      await user.save();

      await notificationService.sendNotification({
        recipientId: user._id,
        type: "ban_appeal_approved",
        title: "Your account appeal was approved",
        body: "Admin has restored your account. You can sign in again now.",
        link: "/auth/sign-in",
        metadata: {
          appealId: appeal._id.toString(),
        },
      });

      await safeSendEmail({
        to: user.email,
        subject: "Your account has been restored",
        template: "banAppealResult.ejs",
        data: {
          username: user.username,
          decision: "approved",
          note: appeal.reviewNote || "",
          signInUrl: `${process.env.CLIENT_URL}/auth/sign-in`,
        },
      });
    } else {
      await notificationService.sendNotification({
        recipientId: user._id,
        type: "ban_appeal_rejected",
        title: "Your account appeal was rejected",
        body: "Admin reviewed your appeal but did not restore the account at this time.",
        link: "/",
        metadata: {
          appealId: appeal._id.toString(),
        },
      });

      await safeSendEmail({
        to: user.email,
        subject: "Appeal review result",
        template: "banAppealResult.ejs",
        data: {
          username: user.username,
          decision: "rejected",
          note: appeal.reviewNote || "",
          signInUrl: `${process.env.CLIENT_URL}/auth/sign-in`,
        },
      });
    }

    return res.json({
      success: true,
      message:
        action === "approve"
          ? "Appeal approved and account restored"
          : "Appeal rejected",
      data: {
        id: appeal._id,
        status: appeal.status,
        reviewedAt: appeal.reviewedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};
