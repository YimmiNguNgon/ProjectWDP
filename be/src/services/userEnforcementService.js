const User = require('../models/User');
const UserViolation = require('../models/UserViolation');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

/**
 * User Enforcement Service (eBay-style)
 * Handles violations, warnings, restrictions, suspensions, and bans
 */
class UserEnforcementService {

    /**
     * Violation severity mapping
     */
    SEVERITY_MAP = {
        phone_number: 'high',
        email_address: 'high',
        social_media_link: 'medium',
        social_media_mention: 'low',
        external_payment: 'critical',
        external_transaction: 'critical',
        external_link: 'medium',
        spam: 'medium',
        harassment: 'critical',
        fraud: 'critical'
    };

    /**
     * Enforcement thresholds (eBay-style progressive enforcement)
     */
    THRESHOLDS = {
        WARNING: 1,           // 1st violation = warning
        RESTRICTION: 2,       // 2nd violation = messaging restriction
        SUSPENSION_7D: 3,     // 3rd violation = 7 days suspension
        SUSPENSION_30D: 4,    // 4th violation = 30 days suspension
        BAN: 5                // 5th violation = permanent ban
    };

    /**
     * Record a violation and take appropriate action
     * @param {Object} params - { userId, violationType, conversation, message, violationText }
     * @returns {Object} - { violation, action, user }
     */
    async recordViolation(params) {
        const { userId, violationType, conversation, message, violationText } = params;

        try {
            // Get user
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Determine severity
            const severity = this.SEVERITY_MAP[violationType] || 'medium';

            // Create violation record
            const violation = await UserViolation.create({
                user: userId,
                violationType,
                severity,
                conversation,
                message,
                violationText,
                isAutomatic: true,
                status: 'pending'
            });

            // Get user's violation count (last 90 days)
            const violationCount = await UserViolation.getUserViolationCount(userId, 90);

            // Determine and take action
            const action = await this.determineAndTakeAction(user, violation, violationCount);

            // Update violation with action taken
            violation.actionTaken = action.type;
            violation.actionReason = action.reason;
            violation.actionTakenAt = new Date();
            violation.status = 'actioned';
            await violation.save();

            // Update user violation stats
            user.violationCount = violationCount;
            user.lastViolationAt = new Date();
            await user.save();

            console.log(`Violation recorded for user ${userId}: ${violationType} -> ${action.type}`);

            return {
                violation,
                action,
                user
            };
        } catch (err) {
            console.error('recordViolation error:', err);
            throw err;
        }
    }

    /**
     * Determine appropriate action based on violation history
     * @param {Object} user - User document
     * @param {Object} violation - Violation document
     * @param {Number} violationCount - Total violations
     * @returns {Object} - { type, reason, duration }
     */
    async determineAndTakeAction(user, violation, violationCount) {
        const { severity } = violation;

        // Critical violations = immediate suspension
        if (severity === 'critical') {
            return await this.suspendUser(user, 30, 'Critical policy violation detected');
        }

        // Progressive enforcement based on count
        if (violationCount >= this.THRESHOLDS.BAN) {
            return await this.banUser(user, 'Multiple policy violations');
        } else if (violationCount >= this.THRESHOLDS.SUSPENSION_30D) {
            return await this.suspendUser(user, 30, 'Repeated policy violations');
        } else if (violationCount >= this.THRESHOLDS.SUSPENSION_7D) {
            return await this.suspendUser(user, 7, 'Multiple policy violations');
        } else if (violationCount >= this.THRESHOLDS.RESTRICTION) {
            return await this.restrictMessaging(user, 7, 'Policy violation - messaging restricted');
        } else {
            return await this.warnUser(user, 'First policy violation - this is a warning');
        }
    }

    /**
     * Issue warning to user
     */
    async warnUser(user, reason) {
        user.warningCount = (user.warningCount || 0) + 1;
        user.lastWarningAt = new Date();
        await user.save();

        return {
            type: 'warning',
            reason,
            message: `⚠️ Warning: ${reason}. Future violations may result in account restrictions.`
        };
    }

    /**
     * Restrict user's messaging ability
     */
    async restrictMessaging(user, days, reason) {
        const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        user.messagingRestricted = true;
        user.messagingRestrictedUntil = until;
        user.messagingRestrictedReason = reason;
        user.status = 'restricted';
        await user.save();

        return {
            type: 'restriction',
            reason,
            duration: days,
            until,
            message: `🔒 Your messaging has been restricted for ${days} days due to: ${reason}`
        };
    }

    /**
     * Suspend user temporarily
     */
    async suspendUser(user, days, reason) {
        const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        user.status = 'suspended';
        user.suspendedUntil = until;
        user.banReason = reason; // Reuse field for suspension reason
        await user.save();

        return {
            type: 'suspension',
            reason,
            duration: days,
            until,
            message: `🚫 Your account has been suspended for ${days} days due to: ${reason}`
        };
    }

    /**
     * Ban user permanently
     */
    async banUser(user, reason) {
        user.status = 'banned';
        user.bannedAt = new Date();
        user.banReason = reason;
        await user.save();

        return {
            type: 'ban',
            reason,
            message: `🔨 Your account has been permanently banned due to: ${reason}`
        };
    }

    /**
     * Check if user can send messages
     * @param {string} userId - User ID
     * @returns {Object} - { allowed, reason }
     */
    async canSendMessage(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) return { allowed: false, reason: 'User not found' };

            // Check if banned
            if (user.status === 'banned') {
                return {
                    allowed: false,
                    reason: `Your account is permanently banned. Reason: ${user.banReason}`
                };
            }

            // Check if suspended
            if (user.status === 'suspended') {
                if (user.suspendedUntil && user.suspendedUntil > new Date()) {
                    const days = Math.ceil((user.suspendedUntil - new Date()) / (24 * 60 * 60 * 1000));
                    return {
                        allowed: false,
                        reason: `Your account is suspended for ${days} more days. Reason: ${user.banReason}`
                    };
                } else {
                    // Suspension expired, reactivate
                    user.status = 'active';
                    user.suspendedUntil = null;
                    await user.save();
                }
            }

            // Check if messaging restricted
            if (user.messagingRestricted) {
                if (user.messagingRestrictedUntil && user.messagingRestrictedUntil > new Date()) {
                    const days = Math.ceil((user.messagingRestrictedUntil - new Date()) / (24 * 60 * 60 * 1000));
                    return {
                        allowed: false,
                        reason: `Your messaging is restricted for ${days} more days. Reason: ${user.messagingRestrictedReason}`
                    };
                } else {
                    // Restriction expired, remove
                    user.messagingRestricted = false;
                    user.messagingRestrictedUntil = null;
                    user.status = 'active';
                    await user.save();
                }
            }

            return { allowed: true };
        } catch (err) {
            console.error('canSendMessage error:', err);
            return { allowed: false, reason: 'Error checking permissions' };
        }
    }

    /**
     * Get user's violation summary
     */
    async getUserViolationSummary(userId) {
        try {
            const user = await User.findById(userId);
            const violations = await UserViolation.getUserViolationHistory(userId);
            const recentCount = await UserViolation.getUserViolationCount(userId, 30);

            return {
                user: {
                    status: user.status,
                    violationCount: user.violationCount || 0,
                    warningCount: user.warningCount || 0,
                    lastViolationAt: user.lastViolationAt,
                    messagingRestricted: user.messagingRestricted,
                    suspendedUntil: user.suspendedUntil
                },
                violations: {
                    total: violations.length,
                    last30Days: recentCount,
                    history: violations.slice(0, 10) // Last 10
                }
            };
        } catch (err) {
            console.error('getUserViolationSummary error:', err);
            throw err;
        }
    }

    /**
     * Appeal a violation
     */
    async appealViolation(violationId, userId, appealReason) {
        try {
            const violation = await UserViolation.findById(violationId);
            if (!violation) throw new Error('Violation not found');
            if (violation.user.toString() !== userId.toString()) {
                throw new Error('Unauthorized');
            }

            violation.appealed = true;
            violation.appealReason = appealReason;
            violation.appealedAt = new Date();
            violation.appealStatus = 'pending';
            await violation.save();

            return violation;
        } catch (err) {
            console.error('appealViolation error:', err);
            throw err;
        }
    }

    /**
     * Review appeal (admin)
     */
    async reviewAppeal(violationId, adminId, approved, notes) {
        try {
            const violation = await UserViolation.findById(violationId);
            if (!violation) throw new Error('Violation not found');

            violation.appealStatus = approved ? 'approved' : 'rejected';
            violation.appealReviewedBy = adminId;
            violation.appealReviewedAt = new Date();
            violation.reviewNotes = notes;

            if (approved) {
                // Reverse the action
                violation.status = 'dismissed';

                // Update user - reduce violation count
                const user = await User.findById(violation.user);
                if (user) {
                    user.violationCount = Math.max(0, (user.violationCount || 0) - 1);
                    await user.save();
                }
            }

            await violation.save();
            return violation;
        } catch (err) {
            console.error('reviewAppeal error:', err);
            throw err;
        }
    }
}

module.exports = new UserEnforcementService();
