const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AppError = require("../utilities/appError.util");
const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "products"
);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "_" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedFiles = [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  if (
    !allowedFiles.includes(ext) ||
    !allowedMimeTypes.includes(file.mimetype)
  ) {
    return cb(
      new AppError(
        "Only PNG, JPG, JPEG and WEBP images are allowed",
        400
      ),
      false
    );
  }

  cb(null, true);
};

const MB = 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * MB,
    files: 1,
  },
});

module.exports = {upload};