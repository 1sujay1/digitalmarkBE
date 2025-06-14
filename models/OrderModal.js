const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      price: Number
    }
  ],
  amountPaid: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentStatus: { type: String, default: "PENDING" }, // PENDING, PAID, FAILED
  createdAt: { type: Date, default: Date.now },
  paymentResponse: {
    type: mongoose.Schema.Types.Mixed, // Can hold any JSON
    default: {}
  },
    isDeleted: { type: Boolean, default: false  },
  paymentAttempts: [{
  status: { type: String, enum: ["PAID", "FAILED"] },
  response: mongoose.Schema.Types.Mixed,
  attemptedAt: { type: Date, default: Date.now },
}],
},{timestamps:true});

module.exports = mongoose.model("Order", OrderSchema);
