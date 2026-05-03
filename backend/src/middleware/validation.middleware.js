import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation Errors:", JSON.stringify(errors.array(), null, 2));
    return next(new ApiError(422, "Validation failed", errors.array()));
  }
  return next();
}
