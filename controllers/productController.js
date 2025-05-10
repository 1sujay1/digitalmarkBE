const { ProductModal } = require("../models");
const { handleSuccessMessages, handleErrorMessages } = require("../utils/responseMessages");

exports.getAllProducts = async (req, res) => {
  try {
    const products = await ProductModal.find().select('-driveLink');
    return handleSuccessMessages(res, "Products fetched successfully", products);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to fetch products");
  }
};
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const products = await ProductModal.find();
    return handleSuccessMessages(res, "Products fetched successfully", products);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to fetch products");
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await ProductModal.findById(req.params.id);
    if (!product) return handleErrorMessages(res, "Product not found", 404);
    return handleSuccessMessages(res, "Product fetched successfully", product);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to fetch product");
  }
};

exports.createProduct = async (req, res) => {
  try {
    // Ensure slashedPrice is a positive number
    if (!req.body.slashedPrice || req.body.slashedPrice <= 0) {
      return handleErrorMessages(res, "Slashed price must be a positive number");
    }

    // Ensure discount is within a valid range (0-100)
    if (!req.body.discount || req.body.discount < 0 || req.body.discount > 100) {
      return handleErrorMessages(res, "Discount must be between 0 and 100");
    }
    // Convert discount and slashedPrice to Number
    ['slashedPrice', 'discount'].forEach(key => req.body[key] = Number(req.body[key]));
    // Calculate price dynamically based on slashedPrice and discount
    req.body.price = req.body.slashedPrice - (req.body.slashedPrice * (req.body.discount || 0)) / 100;
    // Round off the price to two decimal places
    req.body.price = Math.floor(req.body.price);
    const product = new ProductModal(req.body);
    await product.save();
    return handleSuccessMessages(res, "Product created successfully", product, 201);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to create product");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updatedProduct = await ProductModal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) return handleErrorMessages(res, "Product not found", 404);

    return handleSuccessMessages(res, "Product updated successfully", updatedProduct);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to update product");
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await ProductModal.findByIdAndDelete(req.params.id);

    if (!deletedProduct) return handleErrorMessages(res, "Product not found", 404);

    return handleSuccessMessages(res, "Product deleted successfully", deletedProduct);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to delete product");
  }
};
