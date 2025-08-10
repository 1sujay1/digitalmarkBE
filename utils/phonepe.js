const { StandardCheckoutClient, Env } = require("pg-sdk-node");
const axios = require("axios");

// Initialize PhonePe SDK client
const phonepeClient = StandardCheckoutClient.getInstance(
  process.env.PHONEPE_CLIENT_ID, // From PhonePe dashboard
  process.env.PHONEPE_CLIENT_SECRET, // From PhonePe dashboard
  parseInt(process.env.PHONEPE_VERSION || "1"), // API version, usually 1
  process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
);

async function getPhonePeAuthAPI() {
  const requestHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const requestBodyJson = {
    client_version: process.env.PHONEPE_VERSION || "1",
    grant_type: "client_credentials",
    client_id: process.env.PHONEPE_CLIENT_ID,
    client_secret: process.env.PHONEPE_CLIENT_SECRET,
  };

  const requestBody = new URLSearchParams(requestBodyJson).toString();

  const options = {
    method: "POST",
    url: process.env.PHONEPE_AUTH_TOKEN_URL,
    headers: requestHeaders,
    data: requestBody,
  };

  try {
    const response = await axios.request(options);
    return {
      status: 200,
      data: response.data,
    };
  } catch (error) {
    console.error("Error fetching PhonePe auth token:", error);
    return {
      status: error.response ? error.response.status : 500,
      message: error.message || "Failed to fetch PhonePe auth token",
    };
  }
}

async function createPhonepePayment(paymentData) {
  const authTokenResponse = await getPhonePeAuthAPI();
  console.log("authTokenResponse", authTokenResponse);
  if (authTokenResponse.status !== 200) {
    return {
      status: authTokenResponse.status || 500,
      message: authTokenResponse.message || "Failed to get auth token",
    };
  }
  const authToken = authTokenResponse.data.access_token;
  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `O-Bearer ${authToken}`,
  };

  const requestBody = {
    amount: paymentData.amount,
    expireAfter: paymentData.expireAfter || 1200,
    metaInfo: paymentData.metaInfo || {
      udf1: "Order from DigitalMark Services",
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
    },
    paymentFlow: paymentData.paymentFlow || {
      type: "PG_CHECKOUT",
      message: "DigitalMark Services payment collect requests",
      merchantUrls: {
        redirectUrl: `${process.env.PHONEPE_CALLBACK_URL}/?merchantOrderId=${paymentData.merchantOrderId}`,
      },
    },
    merchantOrderId: paymentData.merchantOrderId,
  };

  const options = {
    method: "POST",
    url: process.env.PHONEPE_CREATE_PAYMENT_URL,
    headers: requestHeaders,
    data: requestBody,
  };

  try {
    const response = await axios.request(options);
    console.log("createPhonepePayment response", response.data);
    return {
      status: 200,
      data: response.data,
    };
  } catch (error) {
    console.error("Error creating PhonePe payment:", error);
    return {
      status: error.response ? error.response.status : 500,
      message: error.message || "Failed to create PhonePe payment",
    };
  }
}

async function getOrderStatus(merchantOrderId) {
  const authTokenResponse = await getPhonePeAuthAPI();
  if (authTokenResponse.status !== 200) {
    return {
      status: authTokenResponse.status || 500,
      message: authTokenResponse.message || "Failed to get auth token",
    };
  }
  const authToken = authTokenResponse.data.access_token;
  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `O-Bearer ${authToken}`,
  };
  const options = {
    method: "GET",
    url: `${process.env.PHONEPE_ORDER_STATUS_URL}/${merchantOrderId}/status`,
    headers: requestHeaders,
  };
  try {
    const response = await axios.request(options);
    console.log("getOrderStatus response", response.data);
    return {
      status: 200,
      data: response.data,
    };
  } catch (error) {
    console.error("Error fetching PhonePe order status:", error);
    return {
      status: error.response ? error.response.status : 500,
      message: error.message || "Failed to fetch PhonePe order status",
    };
  }
}
module.exports = {
  phonepeClient,
  getPhonePeAuthAPI,
  createPhonepePayment,
  getOrderStatus,
  // Add other exports as needed
};
