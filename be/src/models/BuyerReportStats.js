const mongoose = require("mongoose");

/**
 * BuyerReportStats – tracks reporting history per buyer.
 * Used to detect report abuse (spam reporting) and compute accuracy score.
 *
 * accuracy_score = valid_reports / total_reports
 * If accuracy_score < 0.3 (and total_reports >= MIN_THRESHOLD),
 * the buyer enters report-monitoring mode and cannot submit new reports temporarily.
 */
const buyerReportStatsSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    totalReports: { type: Number, default: 0 },
    validReports: { type: Number, default: 0 },
    rejectedReports: { type: Number, default: 0 },
    // accuracy_score = validReports / totalReports (recalculated on each update)
    accuracyScore: { type: Number, default: 1.0 },
    lastReportAt: { type: Date, default: null },

    // Monitoring mode – set to true when accuracyScore < 0.3
    underMonitoring: { type: Boolean, default: false },
    monitoringStartedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuyerReportStats", buyerReportStatsSchema);
