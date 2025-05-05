const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    mobile: { type: String }, // Optional for now
    password: { type: String }, // Optional if OTP-only login
    address: { type: String }, 
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    roles:[{type:String,enum: ['CUSTOMER', 'ADMIN', 'MODERATOR'],default:'CUSTOMER'}],
    isDeleted:{type:Boolean,default:false}
},{timestamps:true});

module.exports = mongoose.model("User", userSchema);
