const jwt = require("jsonwebtoken");
const { TokenModal } = require("../models");

const generateToken = async (userId) => {
  const token =  jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  let userToken = await TokenModal.findOne({ userId });
  if (userToken) {
    userToken.tokens.push(token);
    await userToken.save();
  } else {
    await TokenModal.create({
      userId,
      tokens: [token],
    });
  }
  return token
};

module.exports = {generateToken};
