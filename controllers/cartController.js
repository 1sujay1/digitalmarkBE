const Cart = require("../models/CartModal");
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
      cart.items[itemIndex].quantity = quantity || 1;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();

    // Re-fetch the cart to ensure populated productId in the response
    const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
    return handleSuccessMessages(res, "Item added to cart successfully", { items: updatedCart.items });
  } catch (error) {
    console.error(error);
    return handleErrorMessages(res, "Failed to add item to cart", error.message);
  }
};

exports.getMyCart = async (req, res) => {
  const userId = req.decoded.user_id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return handleSuccessMessages(res, "Cart retrieved successfully", { items: [], totalCartPrice: 0 });

    // Calculate totalCartPrice
    const totalCartPrice = cart.items.reduce((total, item) => {
      const productPrice = item.productId.price || 0; // Ensure price exists
      return total + productPrice * item.quantity;
    }, 0);

    // Map items to include product details directly, removing productId key
    const items = cart.items.map(item => {
      const { productId, quantity } = item;
      if (typeof productId === 'object' && productId !== null) {
      // Merge product fields and quantity, exclude _id from product if needed
      const { ...productDetails } = productId.toObject ? productId.toObject() : productId;
      return { ...productDetails, quantity };
      }
      return { quantity };
    });

    return handleSuccessMessages(res, "Cart retrieved successfully", { items, totalCartPrice: Math.floor(totalCartPrice) });
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

exports.removeCartItem = async (req, res) => {
  const { productId } = req.body;
  const userId = req.decoded.user_id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return handleErrorMessages(res, "Cart not found", 404);

    const itemIndex = cart.items.findIndex((item) => item.productId._id.toString() === productId);
    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();

      // Re-fetch the cart to ensure populated productId in the response
      const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
      return handleSuccessMessages(res, "Item removed from cart successfully", { items: updatedCart.items });
    } else {
      return handleErrorMessages(res, "Item not found in cart", 404);
    }
  } catch (error) {
    console.error(error);
    return handleErrorMessages(res, "Failed to remove item from cart", error.message);
  }
};
