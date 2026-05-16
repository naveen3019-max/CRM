import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createServiceRequest,
  getServiceRequest,
  listAssignableWorkers,
  listServiceRequests,
  updateServiceRequest
} from "../services/serviceRequest.service.js";

export const createServiceRequestController = asyncHandler(async (req, res) => {
  const data = await createServiceRequest(req.user, req.body, req.files || []);
  res.status(201).json({ success: true, data });
});

export const listServiceRequestsController = asyncHandler(async (req, res) => {
  const data = await listServiceRequests(req.user, req.query);
  res.json({ success: true, data });
});

export const getServiceRequestController = asyncHandler(async (req, res) => {
  const data = await getServiceRequest(req.user, Number(req.params.id));
  res.json({ success: true, data });
});

export const updateServiceRequestController = asyncHandler(async (req, res) => {
  const data = await updateServiceRequest(req.user, Number(req.params.id), req.body);
  res.json({ success: true, data });
});

export const listAssignableWorkersController = asyncHandler(async (req, res) => {
  const data = await listAssignableWorkers();
  res.json({ success: true, data });
});
