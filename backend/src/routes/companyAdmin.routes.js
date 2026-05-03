import { Router } from "express";
import * as companyAdminController from "../controllers/companyAdmin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";

export const companyAdminRouter = Router();

companyAdminRouter.use(authenticate);
companyAdminRouter.use(authorize("admin"));

companyAdminRouter.get("/companies", companyAdminController.listCompanies);
companyAdminRouter.get("/companies/:id", companyAdminController.getCompanyDetail);
companyAdminRouter.post("/approve/:id", companyAdminController.approveCompany);
companyAdminRouter.post("/reject/:id", companyAdminController.rejectCompany);
