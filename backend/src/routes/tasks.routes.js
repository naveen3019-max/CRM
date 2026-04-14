import { Router } from "express";
import {
  createTask,
  listTasks,
  updateTaskStatus,
  uploadTaskProof
} from "../controllers/tasks.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { upload } from "../utils/upload.js";
import { ROLES } from "../utils/constants.js";

export const tasksRouter = Router();

tasksRouter.use(authenticate);
tasksRouter.get("/", listTasks);
tasksRouter.post("/", authorize(ROLES.ADMIN, ROLES.SALES), createTask);
tasksRouter.patch(
  "/:id/status",
  authorize(ROLES.ADMIN, ROLES.VENDOR, ROLES.ELECTRICIAN, ROLES.FIELD_WORK),
  updateTaskStatus
);
tasksRouter.post(
  "/:id/proof",
  authorize(ROLES.ADMIN, ROLES.ELECTRICIAN, ROLES.FIELD_WORK),
  upload.single("proof"),
  uploadTaskProof
);
