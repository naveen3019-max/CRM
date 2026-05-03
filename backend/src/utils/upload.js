import fs from "fs";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

const uploadRoot = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

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
