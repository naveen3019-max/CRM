import { asyncHandler } from "../utils/asyncHandler.js";
import * as companyService from "../services/company.service.js";

export const listCompanies = asyncHandler(async (req, res) => {
  const result = await companyService.adminListCompanies();
  res.json({ success: true, data: result });
});

export const getCompanyDetail = asyncHandler(async (req, res) => {
  const result = await companyService.adminGetCompanyDetail(req.params.id);
  res.json({ success: true, data: result });
});

export const approveCompany = asyncHandler(async (req, res) => {
  const result = await companyService.adminApproveCompany(req.params.id);
  res.json({ success: true, data: result });
});

export const rejectCompany = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await companyService.adminRejectCompany(req.params.id, reason);
  res.json({ success: true, data: result });
});
