const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(process.env.MONGO_URI);
    // const products = [
    //   {
    //     name: "Complete HTML & CSS Course for Beginners",
    //     price: 499,
    //     driveLink: "https://drive.google.com/file/d/HTML_CSS_Course"
    //   },
    //   {
    //     name: "JavaScript Mastery: From Zero to Hero",
    //     price: 699,
    //     driveLink: "https://drive.google.com/file/d/JS_Course"
    //   },
    //   {
    //     name: "Full Stack MERN Project Bootcamp",
    //     price: 999,
    //     driveLink: "https://drive.google.com/file/d/MERN_Project"
    //   },
    //   {
    //     name: "React.js Crash Course with Projects",
    //     price: 799,
    //     driveLink: "https://drive.google.com/file/d/React_Crash_Course"
    //   },
    //   {
    //     name: "Node.js & Express.js API Development",
    //     price: 599,
    //     driveLink: "https://drive.google.com/file/d/Node_API_Course"
    //   }
    // ];
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // Stop server if DB fails
  }
};

module.exports = connectDB;
