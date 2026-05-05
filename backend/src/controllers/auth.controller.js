import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserProfile, loginUser, signupUser, updateUserProfile, verifyEmail } from "../services/auth.service.js";

export const signup = asyncHandler(async (req, res) => {
  const result = await signupUser(req.body);
  res.status(201).json({ success: true, data: result });
});

export const verify = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: "Verification token is required" });
  }
  const result = await verifyEmail(token);
  res.json({ success: true, data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  res.json({ success: true, data: result });
});

export const getProfile = asyncHandler(async (req, res) => {
  const result = await getUserProfile(req.user.id);
  res.json({ success: true, data: result });
});

export const patchProfile = asyncHandler(async (req, res) => {
  const result = await updateUserProfile(req.user.id, req.body);
  res.json({ success: true, data: result });
});
