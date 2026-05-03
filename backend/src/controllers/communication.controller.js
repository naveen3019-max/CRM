import { asyncHandler } from "../utils/asyncHandler.js";
import * as commService from "../services/communication.service.js";

export const getContext = asyncHandler(async (req, res) => {
  const data = await commService.getLeadCommunicationContext(req.params.leadId);
  res.json({ success: true, data });
});

export const postMessage = asyncHandler(async (req, res) => {
  const data = await commService.sendStructuredMessage(req.user, req.params.leadId, req.body);
  res.status(201).json({ success: true, data });
});

export const updateOps = asyncHandler(async (req, res) => {
  const data = await commService.updateLeadOperations(req.user, req.params.leadId, req.body);
  res.json({ success: true, data });
});
