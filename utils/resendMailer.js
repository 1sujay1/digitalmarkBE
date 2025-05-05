const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const fs = require("fs");
const path = require("path");
const sendNodemailerOTPEmail = require('./nodeMailer');

const sendOtpEmail = async (email, otp) => {
  try {
     // Read template
     const templatePath = path.join(__dirname, "./templates/otpEmail.html");
     let html = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders
    html = html
    .replace("{{OTP}}", otp)
    .replace("{{EXPIRY_MINUTES}}", process.env.OTP_EXPIRY_MINUTES)
    .replace("{{YEAR}}", new Date().getFullYear());

    if(process.env.NODE_MAILER_ENABLED){
    const response= await sendNodemailerOTPEmail(email, otp)
    console.log("Nodemailer response",response)
    if(response.status==200){
      return {status:200,mesage:"OTP sent successfully"}
    }else{
      return { status:400,message:"Email send error " };
    }
    }else{
      const response = await resend.emails.send({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Confirm Your Email for DigitalGrowthX",
        html: html,
      });
      console.log("email prod resp",response)
      if(!response?.data || response?.error?.statusCode){
        return {status:response?.error?.statusCode,message:response?.error?.message}
      }
      return { status:200,data:{id: response.id} };
    }
    
  } catch (err) {
    console.error("Resend email error:", err);
    return { status:400,message:"Email send error "+JSON.stringify(err) };
  }
};

module.exports = sendOtpEmail;
