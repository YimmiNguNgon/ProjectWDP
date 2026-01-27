/**
 * Content Moderation Utility
 * Validates message content for policy violations
 */

const PATTERNS = {
    phone_number: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    email_address: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    social_media_link: /(facebook\.com|twitter\.com|instagram\.com|tiktok\.com|linkedin\.com)/gi,
    social_media_mention: /(@[a-zA-Z0-9_]+)/g,
    external_payment: /(paypal|venmo|cashapp|zelle|western union)/gi,
    external_transaction: /(wire transfer|bank transfer|direct payment)/gi,
    external_link: /(http:\/\/|https:\/\/|www\.)/gi,
    spam: /(buy now|click here|limited time|act now|free money)/gi,
};

/**
 * Validate message content
 * @param {string} text - Message text to validate
 * @returns {Object} - { isValid, violations, blockedReason }
 */
function validateMessageContent(text) {
    if (!text || typeof text !== 'string') {
        return { isValid: true, violations: [] };
    }

    const violations = [];

    // Check for phone numbers
    if (PATTERNS.phone_number.test(text)) {
        violations.push('phone_number');
    }

    // Check for email addresses
    if (PATTERNS.email_address.test(text)) {
        violations.push('email_address');
    }

    // Check for social media links
    if (PATTERNS.social_media_link.test(text)) {
        violations.push('social_media_link');
    }

    // Check for external payment mentions
    if (PATTERNS.external_payment.test(text)) {
        violations.push('external_payment');
    }

    // Check for external transaction mentions
    if (PATTERNS.external_transaction.test(text)) {
        violations.push('external_transaction');
    }

    // Check for external links
    if (PATTERNS.external_link.test(text)) {
        violations.push('external_link');
    }

    // Check for spam patterns
    if (PATTERNS.spam.test(text)) {
        violations.push('spam');
    }

    const isValid = violations.length === 0;
    const blockedReason = violations.length > 0
        ? `Message contains restricted content: ${violations.join(', ')}`
        : null;

    return {
        isValid,
        violations,
        blockedReason,
    };
}

module.exports = {
    validateMessageContent,
    PATTERNS,
};
