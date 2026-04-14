import { Router } from "express";
import { createProjectOrder, listProjectOrders, updateProjectOrder } from "../controllers/projects.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { ROLES } from "../utils/constants.js";

export const projectsRouter = Router();

projectsRouter.use(authenticate);
projectsRouter.get("/", listProjectOrders);
projectsRouter.post("/", authorize(ROLES.ADMIN, ROLES.SALES), createProjectOrder);
projectsRouter.patch("/:id", authorize(ROLES.ADMIN, ROLES.VENDOR), updateProjectOrder);
