const { ProductModal, CartModal, OrderModal } = require("../models");
const { handleSuccessMessages, handleErrorMessages } = require("../utils/responseMessages");
const { uploadSingleFile, uploadMultipleFiles } = require("./uploadController");
const path = require("path");
const fs = require("fs");

exports.getAllProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    const products = await ProductModal.find().select('-driveLink');
    // console.log("req?.decoded?.user_id in api", req?.decoded?.user_id);
    if (req?.decoded?.user_id) {
      const cartItem = await CartModal.findOne({ 
        userId: req.decoded.user_id, 
        "items.productId": { $in: products.map(p => p._id) } 
      });

      if (cartItem) {
      products.forEach(product => {
        const cartProduct = cartItem.items.find(item => item.productId.toString() === product._id.toString());
        if (cartProduct) {
          product._doc.quantity = cartProduct.quantity;
        }
      });
      }
        const orders = await OrderModal.find({
            userId: req.decoded.user_id,
            paymentStatus: "PAID"
          })
          // console.log("orders", orders);
          if(orders.length){
            const orderedProductIds = orders.flatMap(order => order.products.map(p => p.productId.toString()));
            const filteredProducts = products.filter(product => !orderedProductIds.includes(product._id.toString()));
            return handleSuccessMessages(res, "Products fetched successfully", filteredProducts);

          }
    }
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
    // If slashedPrice is being updated
    if (req.body.slashedPrice !== undefined) {
      if (req.body.slashedPrice <= 0) {
        return handleErrorMessages(res, "Slashed price must be a positive number");
      }
      req.body.slashedPrice = Number(req.body.slashedPrice);
    }

    // If discount is being updated
    if (req.body.discount !== undefined) {
      if (req.body.discount < 0 || req.body.discount > 100) {
        return handleErrorMessages(res, "Discount must be between 0 and 100");
      }
      req.body.discount = Number(req.body.discount);
    }

    // Recalculate price if slashedPrice or discount is being updated
    if (req.body.slashedPrice !== undefined || req.body.discount !== undefined) {
      // Get the existing product to retain original values if one of them is missing
      const existingProduct = await ProductModal.findById(req.params.id);
      if (!existingProduct) return handleErrorMessages(res, "Product not found", 404);

      const slashedPrice = req.body.slashedPrice !== undefined
        ? req.body.slashedPrice
        : existingProduct.slashedPrice;

      const discount = req.body.discount !== undefined
        ? req.body.discount
        : existingProduct.discount;

      req.body.price = Math.floor(slashedPrice - (slashedPrice * discount) / 100);
    }

    const updatedProduct = await ProductModal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return handleErrorMessages(res, "Product not found", 404);
    }

    return handleSuccessMessages(res, "Product updated successfully", updatedProduct);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to update product");
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await ProductModal.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return handleErrorMessages(res, "Product not found", 404);
    }

    return handleSuccessMessages(res, "Product deleted successfully", deletedProduct);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to delete product");
  }
};

// Upload product thumbnail (single file)
exports.uploadProductThumbnail = (req, res) => {
  req.label = 'product-thumbnail'; // Set label for the file
  req.urlPath='/uploads/products/thumbnails'; // Set URL path for the thumbnail
  uploadSingleFile(req, res, () => {
    if (!req.file) {
      return handleErrorMessages(res, "No file uploaded");
    }
    return handleSuccessMessages(res, "Thumbnail uploaded successfully", { ...req.file, url: urlPath });
  });
};

// Upload product images (multiple files)
exports.uploadProductImages = (req, res) => {
  req.label = 'product-image'; // Set label for the files
  req.urlPath = '/uploads/products/images'; // Set URL path for the images
  uploadMultipleFiles(req, res, () => {
    if (!req.files || req.files.length === 0) {
      return handleErrorMessages(res, "No files uploaded");
    }
    // Construct viewable URLs for each file
    const filesWithUrls = req.files.map(file => ({
      ...file,
      url: `/uploads/products/images/${file.filename}`
    }));
    return handleSuccessMessages(res, "Product images uploaded successfully", filesWithUrls);
  });
};
