import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

let configured = false;

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true
  });
  configured = true;
}

export function isCloudinaryConfigured() {
  return configured;
}

export async function uploadFileToCloudinary(filePath, options = {}) {
  if (!configured) {
    throw new Error("Cloudinary is not configured");
  }

  return cloudinary.uploader.upload(filePath, {
    folder: options.folder || env.cloudinaryFolder,
    public_id: options.publicId,
    resource_type: options.resourceType || "auto",
    use_filename: Boolean(options.useFilename),
    unique_filename: options.uniqueFilename !== false,
    overwrite: Boolean(options.overwrite)
  });
}