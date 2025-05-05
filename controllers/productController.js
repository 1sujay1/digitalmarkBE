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
