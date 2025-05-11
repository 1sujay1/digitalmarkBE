// utils/authorize.js
const jwt = require("jsonwebtoken");
const { UserModal, TokenModal } = require("../models");

const authorize = (requireAuth = false, allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!requireAuth && !req?.headers?.authorization) return next();

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ message: "Unauthorized" });

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const tokenEntry = await TokenModal.findOne({
        userId: decoded.userId,
        tokens: token,
      });

      if (!tokenEntry)
        return res.status(401).json({ message: "Token not found or revoked" });

      const userData = await UserModal.findById(decoded.userId).select("-password");

      if (!userData) return res.status(401).json({ message: "User not found" });

      const userRole = userData.roles[0];
      req.decoded = {
        user_id: userData._id,
        token,
        name: userData.name,
        email: userData.email,
        mobile: userData.mobile,
        role: userRole,
      };

      if (allowedRoles.length && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Access denied: Insufficient role" });
      }

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

module.exports = authorize;
