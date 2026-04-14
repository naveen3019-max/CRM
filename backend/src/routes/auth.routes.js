import { Router } from "express";
import { loginValidation, signupValidation, updateProfileValidation } from "../validations/auth.validation.js";
import { getProfile, login, patchProfile, signup } from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/signup", signupValidation, validateRequest, signup);
authRouter.post("/login", loginValidation, validateRequest, login);
authRouter.get("/profile", authenticate, getProfile);
authRouter.patch("/profile", authenticate, updateProfileValidation, validateRequest, patchProfile);
