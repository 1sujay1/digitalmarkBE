const nodemailer = require("nodemailer");

// Replace these with your Gmail and generated app password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_AUTH_PASSWORD, // 🔐 Use the app password, not your Gmail password
  },
});

const sendBackupOtpEmail = async (toEmail, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #4caf50;">🔐 Your OTP Code</h2>
      <p style="font-size: 16px;">Use the following One-Time Password (OTP) to proceed:</p>
      <p style="font-size: 32px; font-weight: bold; color: #333;">${otp}</p>
      <p style="color: #888;">This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"DigitalGrowthX" <'+process.env.NODEMAILER_EMAIL+'>',
      to: toEmail,
      subject: "Confirm Your Email for DigitalGrowthX",
      html,
    });

    // console.log("✅ Backup OTP sent. Message ID:", info.messageId);
    return { status: 200, id: info.messageId };
  } catch (err) {
    console.error("❌ Error sending backup OTP email:", err);
    return { status: 400 };
  }
};

module.exports = sendBackupOtpEmail;
