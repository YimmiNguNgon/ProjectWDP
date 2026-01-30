// config/redis.js
const { createClient } = require("redis");

const redisClient = createClient({
  url: "redis://localhost:6379",
});

redisClient.connect();

redisClient.on("error", (err) => {
  console.log("Redis error", err);
});

module.exports = redisClient;
