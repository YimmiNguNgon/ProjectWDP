/**
 * reportAntiAbuseService.js
 * 
 * Core logic for the Anti-Abuse Report System.
 */
const Report = require("../models/Report");

// --- Configuration Constants ---
const CONFIG = {
  WEIGHTS: {
    NEW_ACCOUNT: 0.2, // < 3 days old
    NORMAL: 1.0,
    TRUSTED: 2.0,     // e.g. accuracy > 0.8, high orders (mocked as trusted)
    LOW_ACCURACY: 0.0 // accuracy < 0.3
  },
  THRESHOLDS: {
    MIN_DAYS_FOR_NEW_ACCOUNT: 3,
    LOW_ACCURACY: 0.3,
    MIN_MINUTES_BETWEEN_REPORTS: 10,
    SAME_SELLER_COOLDOWN_HOURS: 24,
    SAME_IP_LIMIT: 2,
    PATTERN_CLUSTER_SIZE: 5,
    SELLER_PENALTY_MIN_REPORTS: 3,
    SELLER_PENALTY_MIN_UNIQUE_USERS: 3,
    SELLER_PENALTY_TIME_WINDOW_DAYS: 7
  }
};

/**
 * Check if the buyer's account is considered "new" (< 3 days old).
 */
function isNewAccount(userCreatedAt) {
  if (!userCreatedAt) return true;
  const ageInDays = (Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays < CONFIG.THRESHOLDS.MIN_DAYS_FOR_NEW_ACCOUNT;
}

/**
 * 1. Calculate Report Weight based on buyer trust level.
 * @param {Object} buyer - User object containing { _id, createdAt, role }
 * @param {Object} stats - BuyerReportStats object
 * @returns {number} The calculated weight for the report
 */
function calculateReportWeight(buyer, stats) {
  const totalEvaluated = (stats?.validReports || 0) + (stats?.rejectedReports || 0);

  // Ignored / Low-Quality: accuracy < 0.3 (only if they have enough reports evaluated to be fair)
  if (totalEvaluated >= 5 && (stats?.accuracyScore || 1.0) < CONFIG.THRESHOLDS.LOW_ACCURACY) {
    return CONFIG.WEIGHTS.LOW_ACCURACY; // 0
  }

  // Very new account (< 3 days old)
  if (isNewAccount(buyer?.createdAt)) {
    return CONFIG.WEIGHTS.NEW_ACCOUNT; // 0.2
  }

  // Trusted account context (e.g. valid reports >= 10, high accuracy)
  if (totalEvaluated >= 10 && (stats?.accuracyScore || 1.0) > 0.8) {
    return CONFIG.WEIGHTS.TRUSTED; // 2.0
  }

  // Normal user
  return CONFIG.WEIGHTS.NORMAL; // 1.0
}

/**
 * 2. Analyze the impact of reports and determine Seller Risk Score
 * Calculates the total weighted score of valid reports for a seller.
 * @param {Array} reports - List of reports { _id, buyer, status, weight, ipAddress, ... } 
 * @returns {number} total weighted score
 */
function calculateSellerRiskScore(reports) {
  if (!reports || reports.length === 0) return 0;
  
  return reports.reduce((total, report) => {
    // Only count VALID reports
    if (report.status !== "VALID") return total;
    
    // Default weight is 1.0 if not set
    const weight = typeof report.weight === 'number' ? report.weight : 1.0;
    return total + weight;
  }, 0);
}

/**
 * 3. Evaluate if we should officially flag/penalize a seller.
 * Checks for Delay Effect: e.g. >= 3 Valid Reports AND >= 3 unique users.
 * @param {Array} reports - List of VALID reports within the Time Window limit.
 * @returns {boolean} True if penalty should be applied
 */
function shouldFlagSeller(reports) {
  const validReports = reports.filter(r => r.status === "VALID");
  
  if (validReports.length < CONFIG.THRESHOLDS.SELLER_PENALTY_MIN_REPORTS) {
    return false;
  }

  const uniqueUsers = new Set(validReports.map(r => r.buyer?._id ? r.buyer._id.toString() : r.buyer.toString()));
  if (uniqueUsers.size < CONFIG.THRESHOLDS.SELLER_PENALTY_MIN_UNIQUE_USERS) {
    return false;
  }

  // Both baseline conditions met for penalty
  return true;
}

/**
 * 4 & 6. Pattern Detection: Detect suspicious clusters of reports.
 * Checks for multi-account attacks, botnet patterns (many new accounts targeting one seller).
 * @param {Array} reports - List of recent reports against a seller.
 * @returns {boolean} True if suspicious pattern is detected
 */
function detectSuspiciousPattern(reports) {
  if (!reports || reports.length < CONFIG.THRESHOLDS.PATTERN_CLUSTER_SIZE) {
    return false;
  }

  let newAccountCount = 0;
  let sameIpCounts = {};

  reports.forEach(report => {
    // Check embedded populated user object or the report model itself logic
    const buyerCreatedAt = report.buyer?.createdAt;
    if (isNewAccount(buyerCreatedAt)) {
      newAccountCount++;
    }
    
    if (report.ipAddress) {
      sameIpCounts[report.ipAddress] = (sameIpCounts[report.ipAddress] || 0) + 1;
    }
  });

  // Heuristic A: Cluster heavily skewed toward new accounts (> 70%)
  if ((newAccountCount / reports.length) > 0.7 && reports.length >= CONFIG.THRESHOLDS.PATTERN_CLUSTER_SIZE) {
    return true;
  }

  // Heuristic B: Same IP dominates the cluster
  const ipCountsArray = Object.values(sameIpCounts);
  const maxIpUsage = ipCountsArray.length > 0 ? Math.max(...ipCountsArray) : 0;
  // If a single IP generates more than max(3, 40% of cluster logic) it's suspicious
  if (maxIpUsage > Math.max(3, reports.length * 0.4)) {
    return true; // Single IP generates > 40% of reports -> Bot attack
  }

  return false;
}

/**
 * 5. Advanced rate limiting / pre-submission checks
 * Validates advanced rate limits and checks for IP limits.
 */
async function validateReportSubmission(buyerId, sellerId, userIp, deviceFingerprint) {
  const now = new Date();

  // 1. Check IP limit (anti multi-account abuse)
  if (userIp) {
    const recentIpReports = await Report.countDocuments({
      ipAddress: userIp,
      seller: sellerId,
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // last 24h
    });
    // Ignore extra reports from same IP > threshold
    if (recentIpReports >= CONFIG.THRESHOLDS.SAME_IP_LIMIT) {
      throw { statusCode: 429, message: `Suspicious activity detected from this IP/Device. Report limit exceeded.` };
    }
  }

  if (deviceFingerprint) {
    const recentDeviceReports = await Report.countDocuments({
      deviceFingerprint,
      seller: sellerId,
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    });
    if (recentDeviceReports >= CONFIG.THRESHOLDS.SAME_IP_LIMIT) {
      throw { statusCode: 429, message: `Suspicious activity detected from this Device. Report limit exceeded.` };
    }
  }

  // 2. Minimum 10 minutes between any reports by this buyer
  const lastReport = await Report.findOne({ buyer: buyerId }).sort({ createdAt: -1 }).lean();
  if (lastReport) {
    const diffMins = (now.getTime() - new Date(lastReport.createdAt).getTime()) / (1000 * 60);
    if (diffMins < CONFIG.THRESHOLDS.MIN_MINUTES_BETWEEN_REPORTS) {
      throw { statusCode: 429, message: `Please wait at least 10 minutes before submitting another report.` };
    }
  }

  // 3. Cannot report the exact same seller within short time
  const duplicateReport = await Report.findOne({
    buyer: buyerId,
    seller: sellerId,
    createdAt: { $gte: new Date(now.getTime() - CONFIG.THRESHOLDS.SAME_SELLER_COOLDOWN_HOURS * 60 * 60 * 1000) }
  });
  if (duplicateReport) {
    throw { statusCode: 429, message: `You have already reported this seller recently. Please allow time for investigation.` };
  }

  return true;
}

module.exports = {
  CONFIG,
  calculateReportWeight,
  calculateSellerRiskScore,
  shouldFlagSeller,
  detectSuspiciousPattern,
  validateReportSubmission,
  isNewAccount
};
