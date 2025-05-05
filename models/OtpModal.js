const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema(
  {
    email: String,
    mobile: String,
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isDeleted:{type:Boolean,default:false}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", OtpSchema);
