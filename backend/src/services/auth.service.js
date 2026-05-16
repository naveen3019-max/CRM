import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../utils/constants.js";
import { signAccessToken } from "../utils/jwt.js";
import * as companyRepo from "../repositories/company.repository.js";
import {
  createUser,
  findUserByEmail,
  findUserByMobile,
  findUserById,
  findUserWithPasswordById,
  updateUserProfileById,
  updateVerificationToken,
  findUserByVerificationToken,
  markEmailAsVerified
} from "../repositories/user.repository.js";

export async function signupUser(payload) {
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  const existingMobile = await findUserByMobile(payload.mobile);
  if (existingMobile) {
    throw new ApiError(409, "Mobile number already registered");
  }

  let role = Object.values(ROLES).includes(payload.role) ? payload.role : ROLES.CUSTOMER;
  if (!Object.values(ROLES).includes(payload.role) && payload.workType) {
    role = ROLES.SERVICE_PROFESSIONAL;
  }
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const userId = await createUser({
    name: payload.name,
    email: payload.email,
    passwordHash,
    role,
    mobile: payload.mobile,
    workType: payload.workType,
    serviceCategory: payload.workType || null,
    preferredLanguage: payload.preferredLanguage || "en"
  });

  if (role === ROLES.VENDOR) {
    // For vendors, create a company profile immediately and allow onboarding
    await companyRepo.createCompanyProfile({
      userId,
      name: payload.name,
      email: payload.email
    });

    const token = signAccessToken({
      id: userId,
      email: payload.email,
      role
    });

    return {
      token,
      user: {
        id: userId,
        name: payload.name,
        email: payload.email,
        role,
        phone: null,
        mobile: payload.mobile,
        serviceCategory: payload.workType || null,
        preferredLanguage: payload.preferredLanguage || "en",
        profileCompleted: false,
        companyStatus: "pending"
      }
    };
  }

  // For non-vendors, provide immediate login
  const token = signAccessToken({
    id: userId,
    email: payload.email,
    role
  });

  return {
    token,
    user: {
      id: userId,
      name: payload.name,
      email: payload.email,
      role,
      phone: null,
      mobile: payload.mobile,
      serviceCategory: payload.workType || null,
      preferredLanguage: payload.preferredLanguage || "en",
      profileCompleted: false
    }
  };
}

export async function loginUser(payload) {
  const user = await findUserByEmail(payload.email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account disabled. Contact administrator");
  }

  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role
  });
  let companyStatus;

  if (user.role === ROLES.VENDOR) {
    const company = await companyRepo.findCompanyByUserId(user.id);
    companyStatus = company?.status || "not_started";
  }

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
      mobile: user.mobile || null,
      serviceCategory: user.service_category || user.work_type || null,
      preferredLanguage: user.preferredLanguage || "en",
      profileCompleted: Boolean(user.profile_completed),
      ...(user.role === ROLES.VENDOR ? { companyStatus } : {})
    }
  };
}

export async function getUserProfile(actorId) {
  const user = await findUserById(actorId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let companyStatus;
  if (user.role === ROLES.VENDOR) {
    const company = await companyRepo.findCompanyByUserId(actorId);
    companyStatus = company?.status || "not_started";
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    mobile: user.mobile || null,
    state: user.state || null,
    city: user.city || null,
    pincode: user.pincode || null,
    experience: user.experience || null,
    about: user.about || null,
    skills: user.skills || null,
    workType: user.work_type || null,
    preferredLanguage: user.preferredLanguage || "en",
    profileCompleted: Boolean(user.profile_completed),
    createdAt: user.createdAt,
    ...(user.role === ROLES.VENDOR ? { companyStatus } : {})
  };
}

export async function updateUserProfile(actorId, payload) {
  const user = await findUserWithPasswordById(actorId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Role-based validation for profile completion
  if (payload.profileCompleted) {
    // For non-customer roles, about field is required
    if (user.role !== ROLES.CUSTOMER && (!payload.about || payload.about.trim().length < 20)) {
      throw new ApiError(400, `${user.role} role requires 'about' section with at least 20 characters`);
    }
  }

  let passwordHash;
  if (payload.newPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new ApiError(401, "Current password is incorrect");
    }
    passwordHash = await bcrypt.hash(payload.newPassword, 10);
  }

  // Build update payload with only provided profile fields
  const updatePayload = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.phone !== undefined && { phone: payload.phone }),
    ...(payload.mobile !== undefined && { mobile: payload.mobile }),
    ...(payload.state !== undefined && { state: payload.state }),
    ...(payload.city !== undefined && { city: payload.city }),
    ...(payload.pincode !== undefined && { pincode: payload.pincode }),
    ...(payload.experience !== undefined && { experience: payload.experience }),
    ...(payload.about !== undefined && { about: payload.about }),
    ...(payload.skills !== undefined && { skills: payload.skills }),
    ...(payload.workType !== undefined && { workType: payload.workType }),
    ...(payload.preferredLanguage !== undefined && { preferredLanguage: payload.preferredLanguage }),
    ...(payload.profileCompleted !== undefined && { profileCompleted: payload.profileCompleted }),
    ...(passwordHash && { passwordHash })
  };

  await updateUserProfileById(actorId, updatePayload);

  const updated = await findUserById(actorId);
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    phone: updated.phone || null,
    mobile: updated.mobile || null,
    state: updated.state || null,
    city: updated.city || null,
    pincode: updated.pincode || null,
    experience: updated.experience || null,
    about: updated.about || null,
    skills: updated.skills || null,
    serviceCategory: updated.service_category || updated.work_type || null,
    preferredLanguage: updated.preferredLanguage || "en",
    profileCompleted: Boolean(updated.profile_completed),
    createdAt: updated.createdAt
  };
}

export async function verifyEmail(verificationToken) {
  const user = await findUserByVerificationToken(verificationToken);
  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  if (user.emailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  await markEmailAsVerified(user.id);

  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: null,
      workType: user.work_type || null
    }
  };
}
