const { PhonepeOrderModal, ProductModal, CartModal } = require("../models");
const phonepeClient = require("../utils/phonepe");
const { randomUUID } = require("crypto");
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

exports.createOrder = async (req, res) => {
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
    const existingOrder = await PhonepeOrderModal.findOne({
      userId: req.decoded.user_id,
      "products.productId": { $in: productIds },
      paymentStatus: { $in: ["PAID", "SUCCESS"] },
    });

    if (existingOrder) {
      return handleErrorMessages(
        res,
        "You already own one or more of the selected products.",
        400
      );
    }
    const totalAmount = Math.floor(
      products.reduce((sum, p) => sum + p.price, 0)
    );
    const merchantTransactionId = randomUUID();
    console.log("merchantTransactionId", merchantTransactionId);
    const metaInfo = MetaInfo.builder().udf1("udf1").udf2("udf2").build();
    // Step 1: Create SDK Order
    const sdkOrderRequest = CreateSdkOrderRequest.StandardCheckoutBuilder()
      .merchantOrderId(merchantTransactionId)
      .amount(totalAmount * 100) // in paise
      .redirectUrl(
        `${process.env.PHONEPE_CALLBACK_URL}/?merchantOrderId=${merchantTransactionId}`
      )
      .build();

    const phonepeOrder = await phonepeClient.createSdkOrder(sdkOrderRequest);
    console.log("PhonePe Order Created:", phonepeOrder);
    // Step 2: Initiate Payment to get checkoutPageUrl
    const payRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(phonepeOrder.orderId)
      .amount(totalAmount * 100)
      .redirectUrl(
        `${process.env.PHONEPE_CALLBACK_URL}/?merchantOrderId=${merchantTransactionId}`
      )
      .metaInfo(metaInfo)
      .build();

    const payResponse = await phonepeClient.pay(payRequest);
    console.log("Payment Response:", payResponse);
    // Step 3: Save in DB
    const order = new PhonepeOrderModal({
      userId: req.decoded.user_id,
      products: products.map((p) => ({ productId: p._id, price: p.price })),
      amountPaid: totalAmount,
      merchantTransactionId,
      paymentStatus: "PENDING",
      paymentResponse: payResponse,
      orderResponse: phonepeOrder,
    });

    await order.save();

    return handleSuccessMessages(res, "Order created successfully", {
      merchantTransactionId,
      checkoutPageUrl: payResponse.redirectUrl,
    });
  } catch (err) {
    console.error("Error creating PhonePe order:", err);
    return handleErrorMessages(
      res,
      "Something went wrong while creating order."
    );
  }
};
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
exports.getOrderStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const response = await phonepeClient.getOrderStatus(merchantOrderId);
    const mappedStatus = mapPhonepeStatus(response.state);

    const order = await PhonepeOrderModal.findOne({
      merchantTransactionId: merchantOrderId,
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
      { merchantTransactionId: merchantOrderId },
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

exports.getPhonepeWebOrderStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const response = await phonepeClient.getOrderStatus(merchantOrderId);
    const mappedStatus = mapPhonepeStatus(response.state);

    const order = await PhonepeOrderModal.findOne({
      merchantTransactionId: merchantOrderId,
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
      { merchantTransactionId: merchantOrderId },
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
