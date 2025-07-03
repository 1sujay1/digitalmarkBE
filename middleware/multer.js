// multer.js
const multer = require('multer');
const path = require('path');

// configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(process.cwd(), 'public', 'uploads');
    // Place thumbnails in a separate folder
    if (req.label === 'product-thumbnail') {
    uploadPath = path.join(process.cwd(), 'public', 'uploads', 'products', 'thumbnails');
    } else if (req.label === 'product-image') {
      uploadPath = path.join(process.cwd(), 'public', 'uploads', 'products','images');
    }
        // Create directory if it doesn't exist
    if (!require('fs').existsSync(uploadPath)) {
      require('fs').mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
     // 1️⃣ Overwrite case: existingFilename is provided
     console.log('req.body.existingFilename', req?.existingFilename);
  if (req?.body?.existingFilename) {
    return cb(null, req.body.existingFilename);
  }
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    // Use original name (without extension) + dynamic label + unique timestamp + ext
    let label = '';
    if (req.label) {
      label = '-' + req.label;
    }
    const baseName = path.basename(file.originalname, ext);
    cb(null, baseName + label + '-' + uniqueSuffix + ext);
  }
});


// create multer upload instance
const upload = multer({ storage });

module.exports = upload;
