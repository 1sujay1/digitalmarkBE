const { StandardCheckoutClient, Env } = require("pg-sdk-node");

// Initialize PhonePe SDK client
const phonepeClient = StandardCheckoutClient.getInstance(
  process.env.PHONEPE_CLIENT_ID, // From PhonePe dashboard
  process.env.PHONEPE_CLIENT_SECRET, // From PhonePe dashboard
  parseInt(process.env.PHONEPE_VERSION || "1"), // API version, usually 1
  process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
);

module.exports = phonepeClient;
