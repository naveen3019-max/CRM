import { asyncHandler } from "../utils/asyncHandler.js";
import { createProject, listProjects, updateProject } from "../services/projects.service.js";

export const listProjectOrders = asyncHandler(async (req, res) => {
  const projects = await listProjects(req.user, req.query);
  res.json({ success: true, data: projects });
});

export const createProjectOrder = asyncHandler(async (req, res) => {
  const result = await createProject(req.body);
  res.status(201).json({ success: true, data: result });
});

export const updateProjectOrder = asyncHandler(async (req, res) => {
  const result = await updateProject(Number(req.params.id), req.body);
  res.json({ success: true, data: result });
});
