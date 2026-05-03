import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import { authRouter } from "./auth.routes.js";
import { chatRouter } from "./chat.routes.js";
import { leadsRouter } from "./leads.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { projectsRouter } from "./projects.routes.js";
import { tasksRouter } from "./tasks.routes.js";
import groupsRouter from "./groups.routes.js";

import { companyRouter } from "./company.routes.js";
import { companyAdminRouter } from "./companyAdmin.routes.js";
import { communicationRouter } from "./communication.routes.js";
import { searchRouter } from "./search.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/leads", leadsRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/groups", groupsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/company", companyRouter);
apiRouter.use("/company-admin", companyAdminRouter);
apiRouter.use("/communication", communicationRouter);
apiRouter.use("/search", searchRouter);
