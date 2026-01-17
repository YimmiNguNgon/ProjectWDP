const bcrypt = require("bcryptjs");
const fs = require("fs");

async function generateHash() {
    const password = "admin123456";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const adminUser = {
        username: "admin1",
        email: "admin1@example.com",
        passwordHash: hash,
        role: "admin",
        isEmailVerified: true,
        status: "active",
        reputationScore: 0,
        violationCount: 0,
        warningCount: 0,
        messagingRestricted: false
    };

    const jsonString = JSON.stringify(adminUser, null, 2);

    fs.writeFileSync("admin1_user.json", jsonString);
    console.log("✅ Đã tạo file admin1_user.json");
    console.log("\nNội dung:");
    console.log(jsonString);
}

generateHash().catch(console.error);
