import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { isCloudinaryConfigured } from "../config/cloudinary.js";
import { resolveUploadedFileUrl } from "../utils/upload.js";
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

  const fileUrl = resolveUploadedFileUrl(req.file);
  await companyService.saveDocument(req.user.id, req.user.email, docType, {
    url: fileUrl,
    publicId: req.file?.filename || null,
    mimeType: req.file?.mimetype || null,
    size: req.file?.size || null,
    fileName: req.file?.originalname || null
  });

  res.json({
    success: true,
    data: {
      url: fileUrl,
      fileUrl,
      publicId: req.file?.filename || null,
      mimeType: req.file?.mimetype || null,
      size: req.file?.size || null,
      fileName: req.file?.originalname || null
    }
  });
});

export const getStatus = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanyStatus(req.user.id, req.user.email);
  res.json({ success: true, data: result });
});
