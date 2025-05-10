const Cart = require("../models/cartModel");
const { handleSuccessMessages, handleErrorMessages } = require("../utils/responseMessages");

exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.decoded.user_id;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    return handleSuccessMessages(res, "Item added to cart successfully", cart);
  } catch (error) {
    console.error(error);
    return handleErrorMessages(res, "Failed to add item to cart", error.message);
  }
};

exports.getMyCart = async (req, res) => {
  const userId = req.decoded.user_id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    return handleSuccessMessages(res, "Cart retrieved successfully", cart);
  } catch (error) {
    console.error(error);
    return handleErrorMessages(res, "Failed to retrieve cart", error.message);
  }
};

exports.updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.decoded.user_id;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return handleErrorMessages(res, "Cart not found");

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
      return handleSuccessMessages(res, "Cart item updated successfully", cart);
    } else {
      return handleErrorMessages(res, "Item not found in cart");
    }
  } catch (error) {
    console.error(error);
    return handleErrorMessages(res, "Failed to update cart item", error.message);
  }
};

exports.clearCart = async (req, res) => {
  const userId = req.decoded.user_id;

  try {
    await Cart.findOneAndDelete({ userId });
    return handleSuccessMessages(res, "Cart cleared successfully");
  } catch (error) {
    console.error(error);
    return handleErrorMessages(res, "Failed to clear cart", error.message);
  }
};
