require('dotenv').config();
const mongoose = require('mongoose');
const Conversation = require('./src/models/Conversation');
const Message = require('./src/models/Message');
const { validateMessageContent } = require('./src/utils/contentModerator');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ebay';

/**
 * Scan existing conversations and flag those with violations
 */
async function scanAndFlagExistingConversations() {
    try {
        console.log('🔍 Scanning existing conversations for violations...\n');

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all conversations
        const conversations = await Conversation.find({}).lean();
        console.log(`📊 Found ${conversations.length} conversations to scan\n`);

        let flaggedCount = 0;
        let violationsFound = 0;

        for (const conv of conversations) {
            // Get all messages in this conversation
            const messages = await Message.find({ conversation: conv._id }).lean();

            let hasViolation = false;
            const violations = [];

            for (const msg of messages) {
                if (!msg.text) continue;

                const moderationResult = validateMessageContent(msg.text);

                if (!moderationResult.isValid) {
                    hasViolation = true;
                    violations.push(...moderationResult.violations);
                    violationsFound++;

                    console.log(`⚠️  Violation found in conversation ${conv._id}`);
                    console.log(`   Message: "${msg.text.substring(0, 50)}..."`);
                    console.log(`   Violations: ${moderationResult.violations.join(', ')}\n`);
                }
            }

            // Flag conversation if violations found
            if (hasViolation) {
                const uniqueViolations = [...new Set(violations)];

                await Conversation.findByIdAndUpdate(conv._id, {
                    flagged: true,
                    flagReason: `Violations detected: ${uniqueViolations.join(', ')}`,
                    flaggedAt: new Date()
                });

                flaggedCount++;
                console.log(`✅ Flagged conversation ${conv._id}\n`);
            }
        }

        console.log('\n Summary:');
        console.log(`   Total conversations scanned: ${conversations.length}`);
        console.log(`   Conversations flagged: ${flaggedCount}`);
        console.log(`   Total violations found: ${violationsFound}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await mongoose.disconnect();
        console.log('\n Disconnected from MongoDB');
        process.exit(0);
    }
}

scanAndFlagExistingConversations();
