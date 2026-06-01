import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const isConfigured = Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true
  });
}

export const isCloudinaryConfigured = isConfigured;
export { cloudinary };