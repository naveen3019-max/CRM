import { Router } from "express";
import {
  assignLead,
  createLead,
  deleteLead,
  getLeadById,
  listLeads,
  updateLead,
  upsertLeadNote
} from "../controllers/leads.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { ROLES } from "../utils/constants.js";
import { createLeadValidation, leadNoteValidation, updateLeadValidation } from "../validations/leads.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";

export const leadsRouter = Router();

leadsRouter.use(authenticate);
leadsRouter.get("/", authorize(ROLES.ADMIN, ROLES.SALES, ROLES.CUSTOMER), listLeads);
leadsRouter.get("/:id", authorize(ROLES.ADMIN, ROLES.SALES, ROLES.CUSTOMER), getLeadById);
leadsRouter.post("/", authorize(ROLES.ADMIN, ROLES.SALES), createLeadValidation, validateRequest, createLead);
leadsRouter.patch("/:id", authorize(ROLES.ADMIN, ROLES.SALES), updateLeadValidation, validateRequest, updateLead);
leadsRouter.patch("/:id/assign", authorize(ROLES.ADMIN), assignLead);
leadsRouter.post("/:id/notes", authorize(ROLES.ADMIN, ROLES.SALES), leadNoteValidation, validateRequest, upsertLeadNote);
leadsRouter.delete("/:id", authorize(ROLES.ADMIN), deleteLead);
