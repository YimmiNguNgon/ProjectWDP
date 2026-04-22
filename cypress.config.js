const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  apiUrl:
    process.env.CYPRESS_API_URL ||
    process.env.VITE_API_URL ||
    "http://localhost:8080",

  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5173",
    env: {
      apiUrl:
        process.env.CYPRESS_API_URL ||
        process.env.VITE_API_URL ||
        "http://localhost:8080",
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
