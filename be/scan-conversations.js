require('dotenv').config();
const mongoose = require('mongoose');
const conversationModerationService = require('./src/services/conversationModerationService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ebay';

/**
 * Automated Conversation Moderation Scanner
 * Run this script periodically (e.g., via cron job) to scan conversations
 */
async function runModerationScan() {
    try {
        console.log('🔍 Starting automated moderation scan...\n');

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get current statistics
        console.log('📊 Current Statistics:');
        const statsBefore = await conversationModerationService.getStatistics();
        console.log(`   Total Conversations: ${statsBefore.totalConversations}`);
        console.log(`   Flagged Conversations: ${statsBefore.flaggedConversations} (${statsBefore.flaggedPercentage}%)`);
        console.log(`   Flagged Messages: ${statsBefore.flaggedMessages}\n`);

        if (statsBefore.violationBreakdown.length > 0) {
            console.log('   Violation Breakdown:');
            statsBefore.violationBreakdown.forEach(v => {
                console.log(`   - ${v.type}: ${v.count}`);
            });
            console.log('');
        }

        // Scan recent conversations (last 24 hours)
        console.log('🔎 Scanning recent conversations (last 24 hours)...');
        const recentResult = await conversationModerationService.scanRecentConversations();

        console.log(`✅ Scan complete!`);
        console.log(`   Scanned: ${recentResult.scanned} conversations`);
        console.log(`   Flagged: ${recentResult.flagged} conversations\n`);

        if (recentResult.results.length > 0) {
            console.log('⚠️  Violations Found:');
            recentResult.results.forEach((result, index) => {
                console.log(`\n   ${index + 1}. Conversation ${result.conversationId}`);
                console.log(`      Violations: ${result.violations.join(', ')}`);
                console.log(`      Violating Messages: ${result.violatingCount}/${result.totalMessages}`);

                if (result.violatingMessages.length > 0) {
                    console.log(`      Sample violations:`);
                    result.violatingMessages.slice(0, 2).forEach(msg => {
                        console.log(`      - "${msg.text.substring(0, 50)}..."`);
                        console.log(`        Violations: ${msg.violations.join(', ')}`);
                    });
                }
            });
        } else {
            console.log('✅ No violations found in recent conversations!');
        }

        // Get updated statistics
        console.log('\n📊 Updated Statistics:');
        const statsAfter = await conversationModerationService.getStatistics();
        console.log(`   Total Conversations: ${statsAfter.totalConversations}`);
        console.log(`   Flagged Conversations: ${statsAfter.flaggedConversations} (${statsAfter.flaggedPercentage}%)`);
        console.log(`   Flagged Messages: ${statsAfter.flaggedMessages}`);

        if (statsAfter.violationBreakdown.length > 0) {
            console.log('\n   Violation Breakdown:');
            statsAfter.violationBreakdown.forEach(v => {
                console.log(`   - ${v.type}: ${v.count}`);
            });
        }

        console.log('\n✅ Moderation scan completed successfully!');

    } catch (err) {
        console.error('❌ Error during moderation scan:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the scan
runModerationScan();
