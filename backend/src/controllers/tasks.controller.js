import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addTaskProof as addTaskProofService,
  createTask as createTaskService,
  listTasks as listTasksService,
  updateTaskStatus as updateTaskStatusService
} from "../services/tasks.service.js";
import { ApiError } from "../utils/ApiError.js";

export const listTasks = asyncHandler(async (req, res) => {
  const tasks = await listTasksService(req.user, req.query);
  res.json({ success: true, data: tasks });
});

export const createTask = asyncHandler(async (req, res) => {
  const result = await createTaskService(req.user, req.body);
  res.status(201).json({ success: true, data: result });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const result = await updateTaskStatusService(
    req.user,
    Number(req.params.id),
    req.body.status,
    req.body.note || null
  );
  res.json({ success: true, data: result });
});

export const uploadTaskProof = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No proof file uploaded");
  }

  const result = await addTaskProofService(
    req.user,
    Number(req.params.id),
    req.file.filename,
    req.body.note || null
  );
  res.status(201).json({ success: true, data: result });
});
