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
  uploadProductThumbnail,
  uploadProductImages,
} = require("../controllers/productController");

const {
  verifyPayment,
  failedPayment,
  getUserProducts,
  isUserAdmin,
  createPayment,
  fetchPaymentOrderStatus,
  cancelOrder,
  phonepeWebHook,
} = require("../controllers/phonepeController");
const {
  addToCart,
  getMyCart,
  updateCartItem,
  clearCart,
  removeCartItem, // Import the new controller function
} = require("../controllers/cartController");
// const {
//   uploadSingleFile,
//   uploadMultipleFiles,
// } = require("../controllers/uploadController");
const authorize = require("../middleware/authMiddleware");
// const multer = require("multer");

const roles = {
  admin: ["ADMIN"],
  customer: ["CUSTOMER"],
  customerAdmin: ["CUSTOMER", "ADMIN"],
};

module.exports = (razorpayInstance) => {
  //Test Routes
  router.get("/test", (req, res) => res.send("Hi, Welcome to the API!"));
  // Auth Routes
  router.post("/auth/email/send-otp", sendOtp);
  router.post("/auth/email/verify-otp", verifyOtp); // Returns token
  // router.post("/auth/signup", signUp);         // Returns token
  router.post("/auth/signInWithEmailPassword", signInWithEmailPassword); // Returns token
  router.post("/auth/logout", logout); // Optional
  router.post("/admin/create-user", authorize(true, roles.admin), createUser);
  router.post("/admin/get-user", getUser);

  // Product Routes
  router.get("/products", authorize(false), getAllProducts);
  router.get("/product/:id", getProductById);
  router.post("/product", authorize(true, roles.admin), createProduct);
  router.put("/product/:id", authorize(true, roles.admin), updateProduct);
  router.delete("/product/:id", authorize(true, roles.admin), deleteProduct);
  router.get(
    "/admin/products",
    authorize(true, roles.admin),
    getAllProductsAdmin
  );

  // Order Routes
  router.post(
    "/create-payment",
    authorize(true, roles.customerAdmin),
    createPayment
  );
  // New getOrderStatus route
  router.get(
    "/order-status/:merchantOrderId",
    authorize(true, roles.customerAdmin),
    fetchPaymentOrderStatus
  );

  router.post(
    "/verify-payment",
    authorize(true, roles.customerAdmin),
    verifyPayment
  );
  router.post(
    "/payment-failed",
    authorize(true, roles.customerAdmin),
    failedPayment
  );
  router.get(
    "/my-products",
    authorize(true, roles.customerAdmin),
    getUserProducts
  );

  router.post(
    "/cancel-order",
    authorize(true, roles.customerAdmin),
    cancelOrder
  );
  router.post(
    "/phonepe-webhook",
    authorize(false, roles.customerAdmin),
    phonepeWebHook
  );
  // Cart Routes
  router.post("/cart/add", authorize(false, roles.customerAdmin), addToCart);
  router.get("/cart", authorize(true, roles.customerAdmin), getMyCart);
  router.put(
    "/cart/update",
    authorize(true, roles.customerAdmin),
    updateCartItem
  );
  router.post("/cart/clear", authorize(true, roles.customerAdmin), clearCart);
  router.post(
    "/cart/remove",
    authorize(true, roles.customerAdmin),
    removeCartItem
  ); // New route

  //Admin Routes
  router.get("/admin/check", authorize(true, roles.admin), isUserAdmin);

  //Upload Routes
  router.post(
    "/product/thumbnail/upload",
    authorize(true, roles.admin),
    uploadProductThumbnail
  );
  router.post(
    "/product/images/uploads",
    authorize(true, roles.admin),
    uploadProductImages
  );

  return router;
};
