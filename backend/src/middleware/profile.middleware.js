import { findUserById } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";

export async function requireCompletedProfile(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    if (!user.profileCompleted) {
      return next(new ApiError(403, "Profile completion required"));
    }

    req.user.profileCompleted = true;
    next();
  } catch (error) {
    next(error);
  }
}