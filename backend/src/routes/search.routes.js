import { Router } from "express";
import { performGlobalSearch } from "../controllers/search.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";

export const searchRouter = Router();

searchRouter.get("/global", authenticate, authorize("admin"), performGlobalSearch);
