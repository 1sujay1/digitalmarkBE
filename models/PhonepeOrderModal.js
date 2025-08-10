const mongoose = require("mongoose");

const PhonepeOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        price: Number,
      },
    ],
    amountPaid: Number, // in INR
    phonepeOrderId: { type: String, unique: true }, // PhonePe's transaction ID
    merchantOrderId: { type: String, unique: true }, // optional if you want to store your own order ref
    paymentStatus: {
      type: String,
      default: "PENDING",
      enum: ["SUCCESS", "PAID", "FAILED", "CANCELLED", "PENDING"],
    }, // PENDING, SUCCESS, FAILED
    createdAt: { type: Date, default: Date.now },
    paymentResponse: {
      type: mongoose.Schema.Types.Mixed, // stores raw PhonePe API response
      default: {},
    },
    orderResponse: {
      type: mongoose.Schema.Types.Mixed, // stores raw PhonePe API response
      default: {},
    },
    isDeleted: { type: Boolean, default: false },
    paymentAttempts: [
      {
        status: {
          type: String,
          enum: ["SUCCESS", "FAILED", "CANCELLED", "PENDING", "PAID"],
        },
        response: mongoose.Schema.Types.Mixed,
        attemptedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PhonepeOrder", PhonepeOrderSchema);
