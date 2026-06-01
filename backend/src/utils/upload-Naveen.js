import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import fs from "fs";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { ApiError } from "./ApiError.js";

const uploadRoot = path.resolve(env.uploadDir);
const shouldUseDiskStorage = !isCloudinaryConfigured() && env.nodeEnv !== "production";

if (shouldUseDiskStorage && !fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: env.cloudinaryFolder,
    resource_type: "auto",
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  })
});

const storage = isCloudinaryConfigured() || env.nodeEnv === "production" ? cloudinaryStorage : diskStorage;

function buildUpload({ allowedMimeTypes, fileSizeLimitBytes }) {
  const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new ApiError(400, "Unsupported file type"));
      return;
    }
    cb(null, true);
  };

  return multer({
    storage,
    limits: {
      fileSize: fileSizeLimitBytes
    },
    fileFilter
  });
}

const defaultAllowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const chatAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/3gpp",
  "audio/3gpp2",
  "audio/aac",
  "audio/flac"
];

export const upload = buildUpload({
  allowedMimeTypes: defaultAllowedMimeTypes,
  fileSizeLimitBytes: 5 * 1024 * 1024
});

export const chatUpload = buildUpload({
  allowedMimeTypes: chatAllowedMimeTypes,
  fileSizeLimitBytes: 10 * 1024 * 1024
});

const requestAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export const requestUpload = buildUpload({
  allowedMimeTypes: requestAllowedMimeTypes,
  fileSizeLimitBytes: 25 * 1024 * 1024
});

export function resolveUploadedFileUrl(file) {
  if (!file) {
    return "";
  }

  const candidate = file.secure_url || file.path || file.url || "";
  if (/^(https?:)?\/\//i.test(candidate) || candidate.startsWith("data:") || candidate.startsWith("blob:")) {
    return candidate;
  }

  if (path.isAbsolute(candidate) && file.filename) {
    return `/uploads/${file.filename}`;
  }

  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  return candidate;
}
