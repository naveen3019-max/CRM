import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addNote as addLeadNoteService,
  assignLead as assignLeadService,
  createLead as createLeadService,
  getLead as getLeadService,
  getLeads as getLeadsService,
  removeLead as removeLeadService,
  updateLead as updateLeadService
} from "../services/leads.service.js";

export const createLead = asyncHandler(async (req, res) => {
  const lead = await createLeadService(req.user, req.body);
  res.status(201).json({ success: true, data: lead });
});

export const listLeads = asyncHandler(async (req, res) => {
  const leads = await getLeadsService(req.user, req.query);
  res.json({ success: true, data: leads });
});

export const getLeadById = asyncHandler(async (req, res) => {
  const lead = await getLeadService(req.user, Number(req.params.id));
  res.json({ success: true, data: lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await updateLeadService(req.user, Number(req.params.id), req.body);
  res.json({ success: true, data: lead });
});

export const assignLead = asyncHandler(async (req, res) => {
  const result = await assignLeadService(req.user, Number(req.params.id), Number(req.body.salesId));
  res.json({ success: true, data: result });
});

export const upsertLeadNote = asyncHandler(async (req, res) => {
  const result = await addLeadNoteService(req.user, Number(req.params.id), req.body);
  res.status(201).json({ success: true, data: result });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const result = await removeLeadService(req.user.id, Number(req.params.id));
  res.json({ success: true, data: result });
});
