import { Router } from "express";
import * as commController from "../controllers/communication.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const communicationRouter = Router();

communicationRouter.use(authenticate);

communicationRouter.get("/:leadId/context", commController.getContext);
communicationRouter.post("/:leadId/messages", commController.postMessage);
communicationRouter.patch("/:leadId/operations", commController.updateOps);
