import { asyncHandler } from "../utils/asyncHandler.js";
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
  const result = await companyService.updateBusinessInfo(req.user.id, req.body);
  res.json({ success: true, data: result });
});

export const uploadDoc = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  const { docType } = req.body;
  
  await companyService.saveDocument(req.user.id, docType, fileUrl, req.file.originalname);
  res.json({ success: true, data: { fileUrl } });
});

export const getStatus = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanyStatus(req.user.id);
  res.json({ success: true, data: result });
});
