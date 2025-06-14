const bcrypt = require("bcryptjs");
const sendOtpEmail = require("../utils/resendMailer"); // Resend Email Sending Function
const { generateToken } = require("../utils/generateToken"); // Utility for generating JWT token (if needed)
const { handleSuccessMessages ,handleErrorMessages} = require("../utils/responseMessages");
const { UserModal ,OtpModal} = require("../models");

// 📌 Send OTP (for sign up and verification)
const sendOtp = async (req, res) => {
  const { email, type ,isRegister} = req.body; // type can be 'email' or 'mobile'
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

  try {
    let otpData = null;

    // Handle OTP sending for email or mobile
    if (type === "email") {
      if(!email)return handleErrorMessages(res, "Required Email");

      // Check if the user is already registered with email and isEmailVerified
      const existingUser = await UserModal.find({ email });
      if (existingUser.length > 0 && existingUser[0].isEmailVerified) {
        return handleErrorMessages(res, "Email already registered, Please login");
      }
      otpData = await OtpModal.findOne({ email });

      if (!otpData) {
        otpData = new OtpModal({
          email,
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        }); // 10 minutes expiry
      } else {
        otpData.code = otp;
        otpData.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Reset expiry time
      }

      await otpData.save();

      // Send OTP via Resend (for email)
      const otpResponse = await sendOtpEmail(email, otp);
      if (otpResponse.status == 200) {
        return handleSuccessMessages(res, "OTP sent successfully! to "+email);
      } else {
        return handleErrorMessages(res, otpResponse?.message || "Error sending OTP email");
      }
    } else {
      return handleErrorMessages(res, "Invalid OTP type");
    }
  } catch (err) {
    console.error(err);
    return handleErrorMessages(res, "Server error");
  }
};

// 📌 Verify OTP for Email or Mobile
const verifyOtp = async (req, res) => {
  const { email, otp, type } = req.body;

  try {
    let otpData = null;

    if (type === "email") {
      if(!email)return handleErrorMessages(res, "Required Email");
      if(!otp)return handleErrorMessages(res, "Required OTP");

      otpData = await OtpModal.findOne({ email }).sort({
        updatedAt: -1,
      });

      if (!otpData || otpData.code !== otp || otpData.expiresAt < Date.now()) {
        return handleErrorMessages(res, "Invalid or expired OTP for email");
      }

      // Mark email as verified in User
      const user = await UserModal.findOne({ email });
      // Clear OTP after verification

      if (!user) {
        // await OtpModal.updateOne({ _id: otpData._id }, { isDeleted: true });
        return signUp(req, res);
      }
      if (user) {
        user.isEmailVerified = true;
        await user.save();
     
        // await OtpModal.updateOne({ _id: otpData._id }, { isDeleted: true });
       return  generateTokenAndLogin(res,user,`${type} OTP verified successfully.`)
      }
    } else {
      return handleErrorMessages(res, "Invalid OTP type");
    }
  } catch (err) {
    console.error(err);
    return handleErrorMessages(res, "Server error");
  }
};

// 📌 Sign Up (after OTP verified)
const signUp = async (req, res) => {

  const { email, password,confirmPassword,address, mobile, name,type } = req.body;


  try {
    if(!mobile)return handleErrorMessages(res, "Required Mobile");
    if(!name)return handleErrorMessages(res, "Required Name");
    if(!password)return handleErrorMessages(res, "Required Password");
    if(!confirmPassword)return handleErrorMessages(res, "Required confirm Password");
    if(password != confirmPassword)return handleErrorMessages(res, "Password and confirm Password donot match");

    const userObj = {
      name,
      mobile,
      email,
    };
    if(type=="email"){
      userObj.isEmailVerified=true
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    userObj.password = hashedPassword;
    userObj.address = address;
    const user = await UserModal.create(userObj);

    return  generateTokenAndLogin(res,user,"User registered successfully");

  } catch (err) {
    console.error(err);
    return handleErrorMessages(res, "Server error");
  }
};

// 📌 Sign In
const signInWithEmailPassword = async (req, res) => {
  const { email, password } = req.body;
// console.log(email,password)
  try {
    const user = await UserModal.findOne({ email });

    if (!user || !user.isEmailVerified ) {
      return handleErrorMessages(res, "User not verified or doesn't exist");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return handleErrorMessages(res, "Invalid credentials");

    return  generateTokenAndLogin(res,user,"Login successful");

  } catch (err) {
    console.error(err);
    return handleErrorMessages(res, "Server error");
  }
};
const createUser = async (req, res) => {
  const { password } = req.body;

  try {
    let userObj={...req.body}
    const hashedPassword = await bcrypt.hash(password, 10);
    userObj.password = hashedPassword;
    const user = await UserModal.create(userObj);

    return handleSuccessMessages(res,"User Created Successfully",user)
  } catch (err) {
    console.error(err);
    return handleErrorMessages(res, "Server error");
  }
};

// 📌 Logout
const logout = (req, res) => {
  res.json({ message: "Logout successful" });
};

const  generateTokenAndLogin = async (res,user,message)=>{
  const token =await  generateToken(user._id);
  const data = {
    accessToken: token,
    user: user,
  };
  delete data.user.password;
  return handleSuccessMessages(
    res,
    message,
    data
  );
}
//create a function to get user by email
const getUser = async (req, res) => {
  const { email } = req.body;
  try {
    if(!email)return handleErrorMessages(res, "Required Email");
    const user = await UserModal.findOne({ email });
    if (!user) return handleErrorMessages(res, "User not found", 404);
    return handleSuccessMessages(res, "User fetched successfully", user);
  } catch (err) {
    return handleErrorMessages(res, err.message || "Failed to fetch user");
  }
};
module.exports = {
  sendOtp,
  verifyOtp,
  signUp,
  signInWithEmailPassword,
  logout,
  createUser,
  getUser,
};
