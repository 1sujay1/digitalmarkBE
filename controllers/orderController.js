const { OrderModal, ProductModal,CartModal } = require("../models");
const crypto = require("crypto");
const {
  handleErrorMessages,
  handleSuccessMessages,
} = require("../utils/responseMessages");

exports.createOrder = (razorpayInstance) => async (req, res) => {
  try {
    const { productIds } = req.body;
    const products = await ProductModal.find({ _id: { $in: productIds } });

    if (!products.length) {
      return handleErrorMessages(res, "No valid products found.", 400);
    }

    const totalAmount = Math.floor(products.reduce((sum, p) => sum + p.price, 0));

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
    });

    const order = new OrderModal({
      userId: req.decoded.user_id,
      products: products.map((p) => ({ productId: p._id, price: p.price })),
      amountPaid: totalAmount,
      razorpayOrderId: razorpayOrder.id,
    });

    await order.save();

    return handleSuccessMessages(res, "Order created successfully", {
      ...razorpayOrder,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return handleErrorMessages(
      res,
      "Something went wrong while creating order."
    );
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    console.log(
      " razorpay_order_id, razorpay_payment_id, razorpay_signature",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    console.log("expectedSignature", expectedSignature);
    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return handleErrorMessages(res, "Invalid payment signature", 400);
    }
const order = await OrderModal.findOne({ razorpayOrderId:razorpay_order_id });
console.log("order", order);
// Extract product IDs from the order
const orderedProductIds = order.products.map(p => p.productId);

    await OrderModal.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $push: {
          paymentAttempts: {
            status: "PAID",
            response: req.body,
            attemptedAt: new Date(),
          },
        },
        $set: {
          paymentStatus: "PAID",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentResponse: req.body,
        },
      }
    );
console.log("orderedProductIds", orderedProductIds);
    // Remcove items from user's cart after successful payment
  const updateCartResp = await CartModal.updateOne(
  { userId: req.decoded.user_id },
  {
    $pull: {
      items: {
        productId: { $in: orderedProductIds }
      }
    }
  }
);
console.log("Cart update response:", updateCartResp);
    return handleSuccessMessages(res, "Payment verified successfully", {
      razorpay_payment_id,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    return handleErrorMessages(res, "Payment verification failed");
  }
};

exports.failedPayment = async (req, res) => {
  try {
    const { razorpayOrderId, paymentResponse } = req.body;

    const order = await OrderModal.findOneAndUpdate(
      { razorpayOrderId },
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
    const orders = await OrderModal.find({
      userId: req.decoded.user_id,
      paymentStatus: "PAID"
    }).populate("products.productId");
console.log("orders in getUserProducts", orders);
    const allProducts = orders.flatMap((order) =>
      order.products.map((p) => ({
        name: p.productId.name,
        description: p.productId.description,
        driveLink: p.productId.driveLink,
        price: p.productId.price,
        thumbnail: p.productId.thumbnail,
        images: p.productId.images,
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
