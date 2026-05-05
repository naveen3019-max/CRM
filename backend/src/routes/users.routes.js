import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { searchUsers } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get("/search", searchUsers);