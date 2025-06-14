const express = require("express");
const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  signUp,
  signInWithEmailPassword,
  logout,
  createUser,
  getUser,
} = require("../controllers/authController");

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
} = require("../controllers/productController");

const {
  createOrder,
  verifyPayment,
  failedPayment,
  getUserProducts,
  isUserAdmin
} = require("../controllers/orderController");
const {
  addToCart,
  getMyCart,
  updateCartItem,
  clearCart,
  removeCartItem, // Import the new controller function
} = require("../controllers/cartController");
const authorize = require("../middleware/authMiddleware");

const roles = {
  admin: ["ADMIN"],
  customer: ["CUSTOMER"],
  customerAdmin: ["CUSTOMER", "ADMIN"],
};

module.exports = (razorpayInstance) => {
  //Test Routes
  router.get("/test", (req, res) => res.send("Hi, Welcome"));
  // Auth Routes
  router.post("/auth/email/send-otp", sendOtp);
  router.post("/auth/email/verify-otp", verifyOtp); // Returns token
  // router.post("/auth/signup", signUp);         // Returns token
  router.post("/auth/signInWithEmailPassword", signInWithEmailPassword); // Returns token
  router.post("/auth/logout", logout); // Optional
  router.post("/admin/create-user",authorize(true, roles.admin), createUser);
  router.post("/admin/get-user", getUser);

  // Product Routes
  router.get("/products",authorize(false), getAllProducts);
  router.get("/product/:id", getProductById);
  router.post("/product",authorize(true, roles.admin), createProduct);
  router.put("/product/:id",authorize(true, roles.admin), updateProduct);
  router.delete("/product/:id",authorize(true, roles.admin), deleteProduct);
  router.get("/admin/products",authorize(true, roles.admin), getAllProductsAdmin);

  // Order Routes
  router.post(
    "/create-order",
    authorize(true, roles.customerAdmin),
    createOrder(razorpayInstance)
  );
  router.post("/verify-payment",authorize(true, roles.customerAdmin), verifyPayment);
  router.post("/payment-failed",authorize(true, roles.customerAdmin), failedPayment);
  router.get("/my-products",authorize(true, roles.customerAdmin), getUserProducts);

  // Cart Routes
  router.post("/cart/add", authorize(false, roles.customerAdmin), addToCart);
  router.get("/cart", authorize(true, roles.customerAdmin), getMyCart);
  router.put("/cart/update", authorize(true, roles.customerAdmin), updateCartItem);
  router.delete("/cart/clear", authorize(true, roles.customerAdmin), clearCart);
  router.post("/cart/remove", authorize(true, roles.customerAdmin), removeCartItem); // New route

  //Admin Routes
  router.get("/admin/check", authorize(true, roles.admin), isUserAdmin);
  return router;
};
