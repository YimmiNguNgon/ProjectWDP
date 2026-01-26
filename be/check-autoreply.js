require('dotenv').config();
const mongoose = require('mongoose');
const AutoReplyTemplate = require('./src/models/AutoReplyTemplate');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ebay';

async function checkAutoReplyStatus() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all sellers
        const sellers = await User.find({ role: 'seller' });
        console.log(`📊 Found ${sellers.length} seller(s)\n`);

        for (const seller of sellers) {
            console.log(`\n🔍 Checking templates for seller: ${seller.username} (${seller._id})`);

            const templates = await AutoReplyTemplate.find({ seller: seller._id });

            if (templates.length === 0) {
                console.log('   ⚠️  No templates found for this seller');
                continue;
            }

            console.log(`   Found ${templates.length} template(s):\n`);

            templates.forEach((template, index) => {
                console.log(`   Template #${index + 1}:`);
                console.log(`   - Trigger: ${template.trigger}`);
                console.log(`   - Message: "${template.message}"`);
                console.log(`   - Enabled: ${template.enabled ? '✅ YES' : '❌ NO'}`);
                console.log(`   - Admin Approved: ${template.reviewedByAdmin ? '✅ YES' : '❌ NO'}`);
                console.log(`   - Flagged: ${template.flaggedForReview ? '⚠️ YES - ' + template.flagReason : '✅ NO'}`);
                console.log(`   - Usage Count: ${template.usageCount || 0}`);
                console.log(`   - Delay: ${template.delaySeconds || 0}s`);

                if (template.reviewedByAdmin && template.enabled) {
                    console.log(`   ✅ This template is ACTIVE and will auto-reply`);
                } else if (!template.reviewedByAdmin) {
                    console.log(`   ⚠️  This template needs ADMIN APPROVAL`);
                } else if (!template.enabled) {
                    console.log(`   ⚠️  This template is DISABLED by seller`);
                }
                console.log('');
            });
        }

        console.log('\n📋 Summary:');
        const totalTemplates = await AutoReplyTemplate.countDocuments();
        const activeTemplates = await AutoReplyTemplate.countDocuments({
            enabled: true,
            reviewedByAdmin: true
        });
        const pendingTemplates = await AutoReplyTemplate.countDocuments({
            reviewedByAdmin: false
        });

        console.log(`   Total templates: ${totalTemplates}`);
        console.log(`   Active templates: ${activeTemplates}`);
        console.log(`   Pending approval: ${pendingTemplates}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

checkAutoReplyStatus();
