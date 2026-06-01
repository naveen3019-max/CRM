import multer from "multer";
import path from "path";
import fs from "fs";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { env } from "../config/env.js";

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = env.uploadDir;
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: env.cloudinaryFolder,
    resource_type: "auto",
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    use_filename: true,
    unique_filename: false,
    overwrite: false
  })
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only images (jpeg, jpg, png) and PDFs are allowed."));
  }
};

export const upload = multer({
  storage: isCloudinaryConfigured ? cloudinaryStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});
