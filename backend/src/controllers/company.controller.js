import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { isCloudinaryConfigured } from "../config/cloudinary.js";
import { resolveUploadedFileUrl } from "../utils/upload.js";
import * as companyService from "../services/company.service.js";
import { getCompanyDocumentData } from "../repositories/company.repository.js";

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

  const result = await companyService.saveDocument(req.user.id, req.user.email, docType, {
    buffer: req.file.buffer,
    mimeType: req.file?.mimetype || null,
    size: req.file?.size || null,
    fileName: req.file?.originalname || null
  });

  const fileUrl = `/api/companies/documents/${result.docId}/download`;

  res.json({
    success: true,
    data: {
      url: fileUrl,
      fileUrl,
      publicId: null,
      mimeType: req.file?.mimetype || null,
      size: req.file?.size || null,
      fileName: req.file?.originalname || null
    }
  });
});

export const downloadDoc = asyncHandler(async (req, res) => {
  const { docId } = req.params;
  const doc = await getCompanyDocumentData(docId);

  if (!doc || !doc.file_data) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${doc.file_name || 'document'}"`);
  res.send(doc.file_data);
});


export const getStatus = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanyStatus(req.user.id, req.user.email);
  res.json({ success: true, data: result });
});
