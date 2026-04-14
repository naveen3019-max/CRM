import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserProfile, loginUser, signupUser, updateUserProfile } from "../services/auth.service.js";

export const signup = asyncHandler(async (req, res) => {
  const result = await signupUser(req.body);
  res.status(201).json({ success: true, data: result });
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
