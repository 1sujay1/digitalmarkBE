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
  status: { type: String, default: "PAID" },
  createdAt: { type: Date, default: Date.now }
},{timestamps:true});

module.exports = mongoose.model("Order", OrderSchema);
