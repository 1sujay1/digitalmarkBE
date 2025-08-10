const { PhonepeOrderModal, ProductModal, CartModal } = require("../models");
const phonepeClient = require("../utils/phonepe");
const { randomUUID, createHash, timingSafeEqual } = require("crypto");
const {
  CreateSdkOrderRequest,
  FetchPaymentStatusRequest,
  StandardCheckoutPayRequest,
  MetaInfo,
} = require("pg-sdk-node");
const {
  handleErrorMessages,
  handleSuccessMessages,
} = require("../utils/responseMessages");

function mapPhonepeStatus(phonepeState) {
  switch (phonepeState) {
    case "COMPLETED":
      return "PAID";
    case "FAILED":
    case "DECLINED":
    case "TIMED_OUT":
      return "FAILED";
    case "PENDING":
    default:
      return "PENDING";
  }
}
exports.createPayment = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || !productIds.length) {
      return handleErrorMessages(res, "Product IDs are required.", 400);
    }

    const products = await ProductModal.find({ _id: { $in: productIds } });
    if (!products.length) {
      return handleErrorMessages(res, "No valid products found.", 400);
    }
    // Check if user already owns any of the products
    const existingOrder = await PhonepeOrderModal.find({
      userId: req.decoded.user_id,
      "products.productId": { $in: productIds },
      paymentStatus: { $in: ["PAID", "SUCCESS"] },
    });

    if (existingOrder.length) {
      return handleErrorMessages(
        res,
        "You already own one or more of the selected products.",
        400
      );
    }
    const totalAmount = Math.floor(
      products.reduce((sum, p) => sum + p.price, 0)
    );
    const merchantOrderId = randomUUID();
    console.log("totalAmount", totalAmount);

    const createPaymentResponse = await phonepeClient.createPhonepePayment({
      amount: totalAmount * 100,
      merchantOrderId,
    });
    console.log("createPaymentResponse", createPaymentResponse);
    if (createPaymentResponse.status !== 200) {
      return handleErrorMessages(
        res,
        createPaymentResponse.message || "Failed to create PhonePe payment"
      );
    }

    const order = new PhonepeOrderModal({
      userId: req.decoded.user_id,
      products: products.map((p) => ({ productId: p._id, price: p.price })),
      amountPaid: totalAmount,
      merchantOrderId,
      phonepeOrderId: createPaymentResponse.data.orderId,
      paymentStatus: "PENDING",
      orderResponse: createPaymentResponse.data,
    });

    await order.save();

    return handleSuccessMessages(res, "Order created successfully", {
      phonepeRedirectUrl: createPaymentResponse.data.redirectUrl,
      merchantOrderId,
      phonepeCallbackUrl: `${process.env.PHONEPE_CALLBACK_URL}/?merchantOrderId=${merchantOrderId}`,
    });
  } catch (err) {
    console.error("Error creating PhonePe order:", err);
    return handleErrorMessages(
      res,
      "Something went wrong while creating order."
    );
  }
};
/**
 * GET ORDER STATUS
 * Calls PhonePe's getOrderStatus API, updates DB, and returns status.
 */

exports.fetchPaymentOrderStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const responseData = await phonepeClient.getOrderStatus(merchantOrderId);
    console.log("getOrderStatus responseData", responseData);
    if (responseData.status !== 200) {
      return handleErrorMessages(
        res,
        responseData.message || "Failed to fetch order status"
      );
    }
    const response = responseData.data;
    const mappedStatus = mapPhonepeStatus(response.state);

    const order = await PhonepeOrderModal.findOne({
      merchantOrderId,
    });

    if (!order) {
      return handleErrorMessages(res, "Order not found", 404);
    }

    // Only log if status has changed
    let updateOps = {
      $set: {
        paymentStatus: mappedStatus,
        paymentResponse: response,
      },
    };

    if (order.paymentStatus !== mappedStatus) {
      updateOps.$push = {
        paymentAttempts: {
          status: mappedStatus,
          response,
          attemptedAt: new Date(),
        },
      };
    }

    const updatedOrder = await PhonepeOrderModal.findOneAndUpdate(
      { merchantOrderId },
      updateOps,
      { new: true }
    );
    // console.log("Updated Order:", updatedOrder);
    // console.log("order ", order);
    if (updatedOrder.paymentStatus === "PAID") {
      const orderedProductIds = updatedOrder.products.map((p) => p.productId);
      // console.log("orderedProductIds", orderedProductIds);
      const updateCartResp = await CartModal.updateOne(
        { userId: req.decoded.user_id },
        {
          $pull: {
            items: {
              productId: { $in: orderedProductIds },
            },
          },
        }
      );
      // console.log("updateCartResp", updateCartResp);
    }

    return handleSuccessMessages(res, "Order status fetched successfully", {
      status: updatedOrder.paymentStatus,
      response,
    });
  } catch (err) {
    console.error("Error fetching order status:", err);
    return handleErrorMessages(res, "Something went wrong", 500);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;

    const request = new FetchPaymentStatusRequest(
      process.env.PHONEPE_CLIENT_ID,
      merchantTransactionId
    );

    const statusResponse = await phonepeClient.fetchPaymentStatus(request);

    if (statusResponse.success && statusResponse.data.state === "COMPLETED") {
      const order = await PhonepeOrderModal.findOneAndUpdate(
        { merchantTransactionId },
        {
          $push: {
            paymentAttempts: {
              status: "SUCCESS",
              response: statusResponse,
              attemptedAt: new Date(),
            },
          },
          $set: {
            paymentStatus: "SUCCESS",
            paymentResponse: statusResponse,
          },
        },
        { new: true }
      );

      // Remove from cart
      const orderedProductIds = order.products.map((p) => p.productId);
      await CartModal.updateOne(
        { userId: req.decoded.user_id },
        { $pull: { items: { productId: { $in: orderedProductIds } } } }
      );

      return handleSuccessMessages(
        res,
        "Payment verified successfully",
        statusResponse
      );
    } else {
      return handleErrorMessages(res, "Payment not completed", 400);
    }
  } catch (err) {
    console.error("PhonePe verification error:", err);
    return handleErrorMessages(res, "Payment verification failed");
  }
};

exports.failedPayment = async (req, res) => {
  try {
    const { merchantTransactionId, paymentResponse } = req.body;

    const order = await PhonepeOrderModal.findOneAndUpdate(
      { merchantTransactionId },
      {
        $push: {
          paymentAttempts: {
            status: "FAILED",
            response: req.body,
            attemptedAt: new Date(),
          },
        },
        $set: {
          paymentStatus: "FAILED",
          paymentResponse,
        },
      },
      { new: true }
    );

    if (!order) {
      return handleErrorMessages(res, "Order not found", 404);
    }

    return handleSuccessMessages(
      res,
      "Payment failure synced successfully",
      order
    );
  } catch (err) {
    console.error("Failed payment sync error:", err);
    return handleErrorMessages(res, "Failed to sync payment failure");
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { merchantOrderId } = req.body;
    if (!merchantOrderId) {
      return handleErrorMessages(res, "merchantOrderId is required", 400);
    }

    const order = await PhonepeOrderModal.findOne({ merchantOrderId });
    if (!order) {
      return handleErrorMessages(res, "Order not found", 404);
    }

    if (order.paymentStatus === "PAID" || order.paymentStatus === "SUCCESS") {
      return handleErrorMessages(res, "Cannot cancel a completed payment", 400);
    }

    order.paymentStatus = "CANCELLED";
    order.paymentAttempts = order.paymentAttempts || [];
    order.paymentAttempts.push({
      status: "CANCELLED",
      response: { message: "Order cancelled by user" },
      attemptedAt: new Date(),
    });
    await order.save();

    return handleSuccessMessages(res, "Payment cancelled successfully", {});
  } catch (err) {
    console.error("Error cancelling payment:", err);
    return handleErrorMessages(res, "Failed to cancel payment");
  }
};

exports.getUserProducts = async (req, res) => {
  try {
    const orders = await PhonepeOrderModal.find({
      userId: req.decoded.user_id,
      //   paymentStatus: "PAID",
    }).populate("products.productId");

    const allProducts = orders.flatMap((order) =>
      order.products.map((p) => ({
        name: p.productId.name,
        description: p.productId.description,
        driveLink: p.productId.driveLink,
        price: p.productId.price,
        thumbnail: p.productId.thumbnail,
        images: p.productId.images,
        status: order.paymentStatus,
        date: p.productId.createdAt,
      }))
    );

    return handleSuccessMessages(
      res,
      "User products fetched successfully",
      allProducts
    );
  } catch (err) {
    console.error("Fetching user products failed:", err);
    return handleErrorMessages(res, "Could not fetch user products");
  }
};
exports.phonepeWebHook = async (req, res) => {
  try {
    // Store your PhonePe webhook credentials in ENV variables
    const WEBHOOK_USERNAME = process.env.PHONEPE_WEBHOOK_USER;
    const WEBHOOK_PASSWORD = process.env.PHONEPE_WEBHOOK_PASS;
    console.log("PhonePe Webhook received:", req.body);
    const receivedAuth = req.header("Authorization");
    console.log("Received Authorization:", receivedAuth);
    if (!receivedAuth) {
      return handleErrorMessages(res, "Authorization header is missing", 401);
    }
    // 2. Compute expected hash
    const expectedHash = createHash("sha256")
      .update(`${WEBHOOK_USERNAME}:${WEBHOOK_PASSWORD}`)
      .digest("hex");
    console.log("Expected Hash:", expectedHash);
    // Normalize incoming header by stripping "SHA256(" and ")"
    const normalizedAuth = receivedAuth
      .trim()
      .replace(/^SHA256\(/i, "") // remove starting SHA256(
      .replace(/\)$/i, ""); // remove ending )

    console.log("Normalized Authorization:", normalizedAuth);
    // Compare in a timing-safe way
    const cryptoCompare = timingSafeEqual(
      Buffer.from(normalizedAuth, "utf8"),
      Buffer.from(expectedHash, "utf8")
    );
    console.log("Crypto Compare Result:", cryptoCompare);
    if (!cryptoCompare) {
      console.error("Authorization failed");
      return handleErrorMessages(res, "Unauthorized access", 401);
    }
    const { event, payload } = req.body;
    console.log("Webhook received:", event, payload);
    // Example: Update DB based on event type
    if (event === "checkout.order.completed") {
      // Mark order as paid
      console.log(`Order ${payload.orderId} COMPLETED`);
    } else if (event === "checkout.order.failed") {
      console.log(`Order ${payload.orderId} FAILED`);
    }

    const order = await PhonepeOrderModal.findOne({
      phonepeOrderId: payload.orderId,
    });
    if (!order) {
      return handleErrorMessages(res, "Order not found", 404);
    }

    const mappedStatus = mapPhonepeStatus(payload.state);
    if (order.paymentStatus === mappedStatus) {
      return handleSuccessMessages(res, "No status change", {});
    }

    order.paymentStatus = mappedStatus;
    order.paymentResponse = req.body;
    order.paymentAttempts.push({
      status: mappedStatus,
      response: req.body,
      attemptedAt: new Date(),
    });

    await order.save();

    return handleSuccessMessages(res, "Webhook processed successfully", {});
  } catch (err) {
    console.error("Webhook processing error:", err);
    return handleErrorMessages(res, "Failed to process webhook");
  }
};
exports.isUserAdmin = async (req, res) => {
  try {
    const isAdmin = req.decoded.role === "ADMIN";
    return handleSuccessMessages(res, "User role fetched successfully", {
      isAdmin,
    });
  } catch (err) {
    console.error("Error checking admin status:", err);
    return handleErrorMessages(res, "Could not check user role");
  }
};
