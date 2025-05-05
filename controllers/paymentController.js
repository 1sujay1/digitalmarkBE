const razorpayInstance = require("../utils/razorpay");

// Create a payment order
exports.createOrder = async (req, res) => {
  const { amount } = req.body;  // amount should be in paise (100 INR = 10000 paise)

  const options = {
    amount: amount * 100, // Amount in paise
    currency: "INR",
    receipt: `receipt_${Math.random() * 100000}`,
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    res.json({ order });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    res.status(500).send("Error creating Razorpay order");
  }
};
