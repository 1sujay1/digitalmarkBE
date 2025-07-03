const upload = require("../middleware/multer");


// Multer upload handler for single file POST requests
const uploadSingleFile = (req, res) => {
  
    upload.single('file')(req, res, function (err) {
          let uploadPath = `${process.env.BASEURL}/uploads/${req.file.filename}`;
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        if(req.urlPath) {
            uploadPath = `${process.env.BASEURL}`+req.urlPath+`/${req.file.filename}`; // Use custom URL path if provided
        }
        res.status(200).json({ success: true, location:uploadPath });
    });
};

// Multer upload handler for multiple files POST requests
const uploadMultipleFiles = (req, res) => {
    upload.array('files')(req, res, function (err) {
        let urlPath = `${process.env.BASEURL}/uploads`;
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        if(req.urlPath) {
            urlPath = req.urlPath;
        }
        const filesWithLocations = req.files.map(file => ({
            // ...file,
            location: `${process.env.BASEURL}${urlPath}/${file.filename}`
        }));
        res.status(200).json({ success: true, files: filesWithLocations });
    });
};

module.exports = { uploadSingleFile, uploadMultipleFiles };
