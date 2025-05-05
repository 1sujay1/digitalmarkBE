const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    tokens: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Token", TokenSchema);
