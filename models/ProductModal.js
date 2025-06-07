const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // Discount percentage (e.g., 10 for 10%)
  slashedPrice: { type: Number }, // Deprecated if discount is used
  description: String,
  thumbnail: String,
  driveLink: { type: String, required: true },
  images: [String]
}, { timestamps: true });

ProductSchema.methods.toJSON = function () {
  const product = this.toObject();
  product.price = Math.floor(product.price);
  return product;
};

module.exports = mongoose.model("Product", ProductSchema);
