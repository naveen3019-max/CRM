import { asyncHandler } from "../utils/asyncHandler.js";
import fs from "fs/promises";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "../utils/cloudinary.js";
import * as companyService from "../services/company.service.js";

export const register = asyncHandler(async (req, res) => {
  const result = await companyService.registerCompany(req.body);
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await companyService.loginCompany(req.body);
  res.json({ success: true, data: result });
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const result = await companyService.updateBusinessInfo(req.user.id, req.user.email, req.body);
  res.json({ success: true, data: result });
});

export const uploadDoc = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const { docType } = req.body;
  if (!docType) {
    return res.status(400).json({ success: false, message: "Document type (docType) is required" });
  }

  if (env.nodeEnv === "production" && !isCloudinaryConfigured()) {
    throw new ApiError(503, "Document storage is not configured.");
  }

  let fileUrl = `/uploads/${req.file.filename}`;

  try {
    if (isCloudinaryConfigured()) {
      const uploadResult = await uploadFileToCloudinary(req.file.path, {
        folder: env.cloudinaryFolder,
        publicId: `company-${req.user.id}-${docType}-${Date.now()}`,
        resourceType: "auto"
      });

      fileUrl = uploadResult.secure_url || uploadResult.url || fileUrl;
    }

    await companyService.saveDocument(req.user.id, req.user.email, docType, fileUrl, req.file.originalname);
    res.json({ success: true, data: { fileUrl } });
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path).catch(() => {});
    }
  }
});

export const getStatus = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanyStatus(req.user.id, req.user.email);
  res.json({ success: true, data: result });
});
