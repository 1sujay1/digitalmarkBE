const { OrderModal, ProductModal } = require("../models");
const crypto = require("crypto");
const { handleErrorMessages, handleSuccessMessages } = require("../utils/responseMessages");


exports.createOrder = (razorpayInstance) => async (req, res) => {
  try {
    const { productIds } = req.body;
    const products = await ProductModal.find({ _id: { $in: productIds } });

    if (!products.length) {
      return handleErrorMessages(res, "No valid products found.", 400);
    }

    const totalAmount = products.reduce((sum, p) => sum + p.price, 0);

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
    return handleErrorMessages(res, "Something went wrong while creating order.");
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
console.log(" razorpay_order_id, razorpay_payment_id, razorpay_signature", razorpay_order_id, razorpay_payment_id, razorpay_signature)

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
console.log("expectedSignature",expectedSignature)
    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return handleErrorMessages(res, "Invalid payment signature", 400);
    }

    await OrderModal.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $set: {
          paymentStatus: "Paid",
          razorpayPaymentId: razorpay_payment_id,
        },
      }
    );

    return handleSuccessMessages(res, "Payment verified successfully", {
      razorpay_payment_id,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    return handleErrorMessages(res, "Payment verification failed");
  }
};

exports.getUserProducts = async (req, res) => {
  try {
    const orders = await OrderModal.find({
      userId: req.decoded.user_id,
    }).populate("products.productId");

    const allProducts = orders.flatMap((order) =>
      order.products.map((p) => ({
        name: p.productId.name,
        driveLink: p.productId.driveLink,
      }))
    );

    return handleSuccessMessages(res, "User products fetched successfully", allProducts);
  } catch (err) {
    console.error("Fetching user products failed:", err);
    return handleErrorMessages(res, "Could not fetch user products");
  }
};
