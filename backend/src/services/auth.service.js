import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../utils/constants.js";
import { signAccessToken } from "../utils/jwt.js";
import * as companyRepo from "../repositories/company.repository.js";
import {
  createUser,
  findUserByEmail,
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

  const role = Object.values(ROLES).includes(payload.role) ? payload.role : ROLES.CUSTOMER;
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const userId = await createUser({
    name: payload.name,
    email: payload.email,
    passwordHash,
    role
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
        phone: null
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
      phone: null
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

  const token = signAccessToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null
    }
  };
}

export async function getUserProfile(actorId) {
  const user = await findUserById(actorId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    createdAt: user.createdAt
  };
}

export async function updateUserProfile(actorId, payload) {
  const user = await findUserWithPasswordById(actorId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let passwordHash;
  if (payload.newPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new ApiError(401, "Current password is incorrect");
    }
    passwordHash = await bcrypt.hash(payload.newPassword, 10);
  }

  await updateUserProfileById(actorId, {
    name: payload.name,
    phone: payload.phone,
    passwordHash
  });

  const updated = await findUserById(actorId);
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    phone: updated.phone || null,
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
      phone: null
    }
  };
}
