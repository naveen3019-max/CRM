import { Router } from "express";
import * as companyController from "../controllers/company.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { registerValidation, loginValidation, businessInfoValidation } from "../validations/company.validation.js";
import { upload } from "../middleware/upload.middleware.js";

export const companyRouter = Router();

companyRouter.post("/register", registerValidation, validateRequest, companyController.register);
companyRouter.post("/login", loginValidation, validateRequest, companyController.login);

// Authenticated routes
companyRouter.use(authenticate);
companyRouter.get("/status", companyController.getStatus);
companyRouter.post("/business-info", businessInfoValidation, validateRequest, companyController.updateBusiness);
companyRouter.post("/upload-document", upload.single("document"), companyController.uploadDoc);
