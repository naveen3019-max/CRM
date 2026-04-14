import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import { authRouter } from "./auth.routes.js";
import { chatRouter } from "./chat.routes.js";
import { leadsRouter } from "./leads.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { projectsRouter } from "./projects.routes.js";
import { tasksRouter } from "./tasks.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/leads", leadsRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/notifications", notificationsRouter);
