import { Router } from "express";
import { 
  getAdminOverview, 
  getSalesOverview, 
  getSystemHealth, 
  getVendorPerformance, 
  getRecentActivity 
} from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { ROLES } from "../utils/constants.js";

export const analyticsRouter = Router();

analyticsRouter.get("/admin/overview", authenticate, authorize(ROLES.ADMIN), getAdminOverview);
analyticsRouter.get("/sales/overview", authenticate, authorize(ROLES.SALES), getSalesOverview);

analyticsRouter.get("/admin/health", authenticate, authorize(ROLES.ADMIN), getSystemHealth);
analyticsRouter.get("/admin/vendor-performance", authenticate, authorize(ROLES.ADMIN), getVendorPerformance);
analyticsRouter.get("/admin/activity", authenticate, authorize(ROLES.ADMIN), getRecentActivity);
