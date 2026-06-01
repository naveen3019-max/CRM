import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";
import { signAccessToken } from "../utils/jwt.js";
import * as companyRepo from "../repositories/company.repository.js";
import { findUserById } from "../repositories/user.repository.js";
import { createVendorVerificationNotification } from "./notifications.service.js";

async function ensureCompanyProfile(userId, email) {
  const existingCompany = await companyRepo.findCompanyByUserId(userId);
  if (existingCompany) {
    return existingCompany;
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const lookupEmail = email || user.email;
  const companyByEmail = await companyRepo.findCompanyByEmail(lookupEmail);
  if (companyByEmail) {
    await companyRepo.linkCompanyToUserId(companyByEmail.id, userId);
    return (await companyRepo.findCompanyByUserId(userId)) || companyByEmail;
  }

  const companyId = await companyRepo.createCompanyProfile({
    userId,
    name: user.name,
    email: user.email
  });

  return await companyRepo.findCompanyById(companyId);
}

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

export async function updateBusinessInfo(userId, email, payload) {
  const company = await ensureCompanyProfile(userId, email);
  if (!company) {
    throw new ApiError(404, "Company profile not found");
  }
  
  const wasNotPending = company.status !== 'pending';
  try {
    await companyRepo.updateCompanyInfo(company.id, payload);
  } catch (err) {
    // Log detailed context to help diagnose 500s in production (sanitized)
    const safePayload = {
      service_type: payload.service_type,
      description: payload.description ? '[REDACTED]' : undefined,
      years_of_experience: payload.years_of_experience,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      phone: payload.phone,
      business_email: payload.business_email,
      website: payload.website
    };
    console.error("Failed updating company info for companyId=", company.id, "userId=", userId, "payload=", JSON.stringify(safePayload), "error=", err && err.stack ? err.stack : err);
    throw err; // let error middleware convert to 500 and log
  }

  // If this is the first submission (moving from null/rejected to pending), create notification
  if (wasNotPending && company.user_id) {
    try {
      await createVendorVerificationNotification(company.user_id, company.name);
    } catch (err) {
      console.warn("Failed to create vendor verification notification:", err.message);
      // Don't fail the update if notification fails
    }
  }
  
  return { success: true };
}

export async function saveDocument(userId, email, docType, fileData) {
  const company = await ensureCompanyProfile(userId, email);
  if (!company) throw new ApiError(404, "Company profile not found");

  await companyRepo.saveCompanyDocument(company.id, docType, fileData);
  return { success: true };
}

export async function getCompanyStatus(userId, email) {
  const company = (await companyRepo.findCompanyByUserId(userId)) || (email ? await companyRepo.findCompanyByEmail(email) : null);
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
