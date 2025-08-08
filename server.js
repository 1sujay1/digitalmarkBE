const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();
const connectDB = require("./config/db");
const razorpayInstance = require("./utils/razorpay");
const routes = require("./routes/index");

// const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize');

const app = express();

// Connect to MongoDB
connectDB();
app.use(express.static(path.join(__dirname, "public")));
// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const upload = require("./middleware/multer");
app.use(
  session({
    secret: "secret123", // Use secure value in production
    resave: false,
    saveUninitialized: true,
  })
);
// Customize CSP with helmet
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"], // Allow Razorpay script
//       frameSrc: ["'self'", "https://api.razorpay.com"], // Allow Razorpay API to be framed
//       styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles if needed
//       // Add any other specific directives as needed
//     },
//   },
// }));
app.use(cors());

// app.use(function (req, res, next) {
//   res.setHeader("Content-Security-Policy", "script-src 'self' https://checkout.razorpay.com");
//   next();
// });

// app.use((req, res, next) => {
//   req.body = mongoSanitize(req.body);  // Sanitize only the body
//   req.query = mongoSanitize(req.query);  // Sanitize only the query
//   next();
// });
// Routes
app.get("/", (req, res) => {
  res.send("Hello World"); // Serve the main HTML file
});
app.use("/api/v1", routes(razorpayInstance));

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
