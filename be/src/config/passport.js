const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// Chỉ khởi tạo Google OAuth nếu có đầy đủ config
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Tìm user đã tồn tại với googleId
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        // User đã tồn tại, trả về user
                        return done(null, user);
                    }

                    // Kiểm tra xem email đã được sử dụng chưa
                    const existingEmailUser = await User.findOne({
                        email: profile.emails[0].value,
                    });

                    if (existingEmailUser) {
                        // Email đã tồn tại nhưng chưa liên kết với Google
                        // Liên kết tài khoản hiện tại với Google
                        existingEmailUser.googleId = profile.id;
                        existingEmailUser.provider = "google";
                        existingEmailUser.isEmailVerified = true;
                        existingEmailUser.avatarUrl = profile.photos[0]?.value || "";
                        await existingEmailUser.save();
                        return done(null, existingEmailUser);
                    }

                    // Tạo user mới
                    const newUser = new User({
                        googleId: profile.id,
                        username: profile.emails[0].value.split("@")[0] + "_" + Date.now(),
                        email: profile.emails[0].value,
                        provider: "google",
                        isEmailVerified: true,
                        avatarUrl: profile.photos[0]?.value || "",
                        role: "buyer",
                    });

                    await newUser.save();
                    return done(null, newUser);
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    console.log("✅ Google OAuth đã được cấu hình");
} else {
    console.log("⚠️ Google OAuth chưa được cấu hình - thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET");
}

module.exports = passport;
