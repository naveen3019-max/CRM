import { ApiError } from "../utils/ApiError.js";
import { ROLES, TASK_STATUS } from "../utils/constants.js";
import { emitToUser } from "../sockets/state.js";
import { logActivity } from "../repositories/activity.repository.js";
import { createNotificationRecord } from "../repositories/notification.repository.js";
import {
  addTaskUpdateRecord,
  createTaskRecord,
  findTaskById,
  listTaskRecords,
  updateTaskStatusRecord
} from "../repositories/task.repository.js";

export async function listTasks(actor, query) {
  let assignedTo = query.assignedTo ? Number(query.assignedTo) : undefined;
  const roleType = query.roleType;

  if ([ROLES.VENDOR, ROLES.ELECTRICIAN, ROLES.FIELD_WORK].includes(actor.role)) {
    assignedTo = actor.id;
  }

  return listTaskRecords({
    assignedTo,
    roleType,
    status: query.status
  });
}

export async function createTask(actor, payload) {
  const status = payload.status || TASK_STATUS.PENDING;
  const taskId = await createTaskRecord({
    ...payload,
    status,
    createdBy: actor.id
  });

  await createNotificationRecord({
    userId: payload.assignedTo,
    message: `A task has been assigned to you (Task #${taskId})`,
    payloadJson: { taskId, type: "task.assigned" }
  });

  emitToUser(payload.assignedTo, "notification:new", {
    type: "task.assigned",
    taskId
  });

  await logActivity({
    actorId: actor.id,
    action: "task.created",
    entityType: "task",
    entityId: taskId,
    metadata: { assignedTo: payload.assignedTo, roleType: payload.roleType }
  });

  return { taskId };
}

export async function updateTaskStatus(actor, taskId, status, note = null) {
  if (!Object.values(TASK_STATUS).includes(status)) {
    throw new ApiError(400, "Invalid task status");
  }

  const task = await findTaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const isPrivileged = actor.role === ROLES.ADMIN;
  if (!isPrivileged && task.assignedTo !== actor.id) {
    throw new ApiError(403, "You can only update your assigned tasks");
  }

  await updateTaskStatusRecord(taskId, status);
  await addTaskUpdateRecord({
    taskId,
    updatedBy: actor.id,
    status,
    note
  });

  await logActivity({
    actorId: actor.id,
    action: "task.status.updated",
    entityType: "task",
    entityId: taskId,
    metadata: { status }
  });

  return { success: true };
}

export async function addTaskProof(actor, taskId, fileName, note = null) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const isPrivileged = actor.role === ROLES.ADMIN;
  if (!isPrivileged && task.assignedTo !== actor.id) {
    throw new ApiError(403, "You can only upload proof for your assigned tasks");
  }

  const proofImageUrl = `/uploads/${fileName}`;
  await addTaskUpdateRecord({
    taskId,
    updatedBy: actor.id,
    status: task.status,
    note,
    proofImageUrl
  });

  await logActivity({
    actorId: actor.id,
    action: "task.proof.uploaded",
    entityType: "task",
    entityId: taskId,
    metadata: { proofImageUrl }
  });

  return { proofImageUrl };
}
