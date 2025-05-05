const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  slashedPrice: { type: Number },
  description: String,
  thumbnail: String,
  driveLink: { type: String, required: true },
  images:[String]
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
