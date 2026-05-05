import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";
import { signAccessToken } from "../utils/jwt.js";
import * as companyRepo from "../repositories/company.repository.js";

export async function registerCompany(payload) {
  const existing = await companyRepo.findCompanyByEmail(payload.email);
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const companyId = await companyRepo.createCompany({
    name: payload.name,
    email: payload.email,
    passwordHash
  });

  const token = signAccessToken({
    id: companyId,
    email: payload.email,
    role: "company" // Custom role for onboarding users
  });

  return { token, companyId };
}

export async function loginCompany(payload) {
  const company = await companyRepo.findCompanyByEmail(payload.email);
  if (!company) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, company.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signAccessToken({
    id: company.id,
    email: company.email,
    role: "company"
  });

  return { token, company };
}

export async function updateBusinessInfo(userId, payload) {
  const company = await companyRepo.findCompanyById(userId);
  if (!company) {
    throw new ApiError(404, "Company profile not found");
  }
  await companyRepo.updateCompanyInfo(company.id, payload);
  return { success: true };
}

export async function saveDocument(userId, docType, fileUrl, fileName) {
  const company = await companyRepo.findCompanyById(userId);
  if (!company) throw new ApiError(404, "Company profile not found");
  await companyRepo.saveCompanyDocument(company.id, docType, fileUrl, fileName);
  return { success: true };
}

export async function getCompanyStatus(userId) {
  const company = await companyRepo.findCompanyById(userId);
  if (!company) return { status: 'not_started' };
  
  const documents = await companyRepo.getCompanyDocuments(company.id);
  return { ...company, documents };
}

export async function adminListCompanies() {
  return await companyRepo.getAllCompanies();
}

export async function adminGetCompanyDetail(id) {
  const company = await companyRepo.findCompanyById(id);
  const documents = await companyRepo.getCompanyDocuments(id);
  return { ...company, documents };
}

export async function adminApproveCompany(id) {
  await companyRepo.updateCompanyStatus(id, "approved");
  return { success: true };
}

export async function adminRejectCompany(id, reason) {
  await companyRepo.updateCompanyStatus(id, "rejected", reason);
  return { success: true };
}
