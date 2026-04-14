import { Router } from "express";
import { getAdminOverview, getSalesOverview } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { ROLES } from "../utils/constants.js";

export const analyticsRouter = Router();

analyticsRouter.get("/admin/overview", authenticate, authorize(ROLES.ADMIN), getAdminOverview);
analyticsRouter.get("/sales/overview", authenticate, authorize(ROLES.SALES), getSalesOverview);
