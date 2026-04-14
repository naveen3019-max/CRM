import { Router } from "express";
import { listUsers, updateUserRole } from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { ROLES } from "../utils/constants.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize(ROLES.ADMIN));
adminRouter.get("/users", listUsers);
adminRouter.patch("/users/:id/role", updateUserRole);
