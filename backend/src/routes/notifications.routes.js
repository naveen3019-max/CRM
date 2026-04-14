import { Router } from "express";
import { listNotifications, markNotificationRead } from "../controllers/notifications.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);
notificationsRouter.get("/", listNotifications);
notificationsRouter.patch("/:id/read", markNotificationRead);
