import { ApiError } from "../utils/ApiError.js";
import { LEAD_STATUS, ROLES } from "../utils/constants.js";
import {
  createServiceRequestRecord,
  findServiceRequestById,
  listServiceRequestRecords,
  updateServiceRequestRecord
} from "../repositories/serviceRequest.repository.js";
import { createLeadRecord } from "../repositories/lead.repository.js";
import { listAllUsers, listUsersByRoles } from "../repositories/user.repository.js";
import { createNotificationRecord } from "../repositories/notification.repository.js";
import { emitToUser } from "../sockets/state.js";
import { getConversationScopeForRoles } from "../utils/chatPolicy.js";
import { sendConversationMessage } from "./chat.service.js";
import { createWorkAssignment } from "./workAssignment.service.js";
import { isTransientConnectionError } from "../config/db.js";

const SERVICE_REQUEST_STATUSES = ["submitted", "in_review", "assigned", "in_progress", "completed", "cancelled"];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientRetry(task, retries = 1) {
  let attempt = 0;
  while (true) {
    try {
      return await task();
    } catch (error) {
      const shouldRetry = attempt < retries && isTransientConnectionError(error);
      if (!shouldRetry) {
        throw error;
      }

      attempt += 1;
      await wait(200);
    }
  }
}

function parseJsonColumn(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeServiceRequest(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    dynamicAnswers: parseJsonColumn(row.dynamicAnswersJson) || {},
    attachments: parseJsonColumn(row.attachmentsJson) || []
  };
}

function formatRequestMessage(request) {
  const urgencyLabel = request.urgency === "urgent" ? "Urgent" : request.urgency === "important" ? "Important" : "Normal";
  const attachmentCount = Array.isArray(request.attachments) ? request.attachments.length : 0;
  const schedule = [request.preferredDate, request.preferredTime].filter(Boolean).join(" ") || "Flexible";
  const budget = request.budget || "Not specified";

  return [
    "NEW SERVICE REQUEST",
    `Request ID: #${request.id}`,
    `Customer: ${request.customerName || "Customer"}`,
    `Service: ${request.serviceCategory}`,
    `Location: ${[request.city, request.areaPincode].filter(Boolean).join(" (")}${request.city && request.areaPincode ? ")" : ""}`,
    `Problem: ${request.problemDescription}`,
    `Expected Solution: ${request.expectedSolution}`,
    `Requirement Details: ${request.requirementDetails}`,
    `Budget: ${budget}`,
    `Preferred Schedule: ${schedule}`,
    `Priority: ${urgencyLabel}`,
    `Attachments: ${attachmentCount}`,
    "Review this request in the Service Requests panel to assign a worker."
  ].join("\n");
}

async function notifyOpsUsers(sender, request) {
  const recipients = await listUsersByRoles([ROLES.ADMIN, ROLES.SALES], sender.id);
  if (!recipients.length) {
    return { recipientIds: [], deliveredChatCount: 0 };
  }

  const messageBody = formatRequestMessage(request);
  let deliveredChatCount = 0;

  for (const recipient of recipients) {
    let scope = null;
    try {
      scope = getConversationScopeForRoles(sender.role, recipient.role);
    } catch {
      scope = null;
    }

    if (scope) {
      try {
        await sendConversationMessage(sender, {
          scope,
          receiverId: recipient.id,
          message: messageBody
        });
        deliveredChatCount += 1;
      } catch {
        // Fall back to notification if direct chat delivery fails.
      }
    }

    await createNotificationRecord({
      userId: recipient.id,
      message: `New ${request.serviceCategory} service request from ${request.customerName}`,
      payloadJson: {
        type: "service_request.new",
        serviceRequestId: request.id,
        customerId: request.customerId
      }
    });

    emitToUser(recipient.id, "notification:new", {
      type: "service_request.new",
      serviceRequestId: request.id,
      customerId: request.customerId
    });
  }

  return {
    recipientIds: recipients.map((recipient) => recipient.id),
    deliveredChatCount
  };
}

export async function createServiceRequest(actor, payload, files = []) {
  if (actor.role !== ROLES.CUSTOMER) {
    throw new ApiError(403, "Only customers can create service requests");
  }

  const attachments = files.map((file) => ({
    url: `/uploads/${file.filename}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  }));

  let dynamicAnswers = payload.dynamicAnswers;
  if (typeof dynamicAnswers === "string") {
    try {
      dynamicAnswers = JSON.parse(dynamicAnswers);
    } catch {
      dynamicAnswers = {};
    }
  }

  const leadId = await createLeadRecord({
    customerId: actor.id,
    assignedSalesId: null,
    status: LEAD_STATUS.NEW,
    source: "service_request",
    title: `${payload.serviceCategory}: ${String(payload.problemDescription || "").slice(0, 80)}`,
    budget: payload.budget || null,
    createdBy: actor.id
  });

  const serviceRequestId = await createServiceRequestRecord({
    customerId: actor.id,
    leadId,
    serviceCategory: payload.serviceCategory,
    problemDescription: payload.problemDescription,
    expectedSolution: payload.expectedSolution,
    requirementDetails: payload.requirementDetails,
    budget: payload.budget,
    urgency: payload.urgency,
    address: payload.address,
    city: payload.city,
    areaPincode: payload.areaPincode,
    preferredDate: payload.preferredDate,
    preferredTime: payload.preferredTime,
    locationLat: payload.locationLat,
    locationLng: payload.locationLng,
    dynamicAnswersJson: dynamicAnswers ? JSON.stringify(dynamicAnswers) : null,
    attachmentsJson: attachments.length ? JSON.stringify(attachments) : null,
    status: "submitted"
  });

  const created = normalizeServiceRequest(await findServiceRequestById(serviceRequestId));
  const { recipientIds, deliveredChatCount } = await notifyOpsUsers(actor, created);

  return {
    ...created,
    notifiedUserIds: recipientIds,
    chatDeliveries: deliveredChatCount
  };
}

export async function listServiceRequests(actor, query = {}) {
  const data = await withTransientRetry(() =>
    listServiceRequestRecords({
      actorRole: actor.role,
      actorId: actor.id,
      status: query.status,
      q: query.q,
      limit: Number(query.limit || 25),
      offset: Number(query.offset || 0)
    })
  );

  return data.map(normalizeServiceRequest);
}

export async function getServiceRequest(actor, serviceRequestId) {
  const row = await findServiceRequestById(serviceRequestId);
  if (!row) {
    throw new ApiError(404, "Service request not found");
  }

  if (actor.role === ROLES.CUSTOMER && Number(row.customerId) !== Number(actor.id)) {
    throw new ApiError(403, "You can only view your own service requests");
  }

  if (actor.role === ROLES.FIELD_WORK && Number(row.assignedWorkerId) !== Number(actor.id)) {
    throw new ApiError(403, "You can only view service requests assigned to you");
  }

  return normalizeServiceRequest(row);
}

export async function uploadProof(actor, serviceRequestId, files = [], note = null) {
  const existing = await findServiceRequestById(serviceRequestId);
  if (!existing) {
    throw new ApiError(404, "Service request not found");
  }

  if (actor.role !== ROLES.FIELD_WORK || Number(existing.assignedWorkerId) !== Number(actor.id)) {
    throw new ApiError(403, "Only the assigned field worker can upload proof for this request");
  }

  const newAttachments = (parseJsonColumn(existing.attachmentsJson) || []).slice();

  const added = (files || []).map((file) => ({
    url: `/uploads/${file.filename}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: actor.id,
    note: note || null,
    uploadedAt: new Date()
  }));

  const merged = newAttachments.concat(added);

  await updateServiceRequestRecord(serviceRequestId, { attachments_json: JSON.stringify(merged) });

  const next = normalizeServiceRequest(await findServiceRequestById(serviceRequestId));

  await createNotificationRecord({
    userId: next.customerId,
    message: `Proof uploaded for your service request #${next.id}`,
    payloadJson: {
      type: "service_request.proof",
      serviceRequestId: next.id
    }
  });

  emitToUser(next.customerId, "notification:new", {
    type: "service_request.proof",
    serviceRequestId: next.id
  });

  return next;
}

export async function updateServiceRequest(actor, serviceRequestId, payload) {
  const existing = await findServiceRequestById(serviceRequestId);
  if (!existing) {
    throw new ApiError(404, "Service request not found");
  }

  if (![ROLES.ADMIN, ROLES.SALES].includes(actor.role)) {
    throw new ApiError(403, "Only admin and sales can update service requests");
  }

  const mapped = {};
  const wantsAssignment = payload.assignedWorkerId !== undefined && payload.assignedWorkerId !== null && String(payload.assignedWorkerId).trim() !== "";

  if (payload.status !== undefined) {
    if (!SERVICE_REQUEST_STATUSES.includes(payload.status)) {
      throw new ApiError(400, "Invalid service request status");
    }

    if (payload.status === "assigned" && !wantsAssignment) {
      throw new ApiError(400, "assignedWorkerId is required when assigning a service request");
    }

    if (payload.status === "cancelled" && !String(payload.cancelReason || "").trim()) {
      throw new ApiError(400, "cancelReason is required when cancelling a service request");
    }

    mapped.status = payload.status;
  }

  if (payload.assignedWorkerId !== undefined) {
    mapped.assigned_worker_id = payload.assignedWorkerId || null;
  }

  if (payload.cancelReason !== undefined) {
    mapped.cancel_reason = String(payload.cancelReason || "").trim() || null;
  }

  const updated = await updateServiceRequestRecord(serviceRequestId, mapped);
  if (!updated) {
    return normalizeServiceRequest(existing);
  }

  const next = normalizeServiceRequest(await findServiceRequestById(serviceRequestId));

  if (next.status === "assigned" && next.assignedWorkerId && Number(existing.assignedWorkerId) !== Number(next.assignedWorkerId)) {
    await createWorkAssignment(
      {
        workerId: next.assignedWorkerId,
        customerId: next.customerId,
        customerName: next.customerName,
        serviceTitle: `${next.serviceCategory} - Request #${next.id}`,
        serviceCategory: next.serviceCategory,
        description: [next.problemDescription, next.expectedSolution, next.requirementDetails].filter(Boolean).join("\n\n"),
        location: [next.address, next.city, next.areaPincode].filter(Boolean).join(", "),
        city: next.city,
        areaPincode: next.areaPincode,
        budget: next.budget,
        priority: next.urgency || "normal",
        preferredDate: next.preferredDate,
        preferredTime: next.preferredTime,
        additionalInstructions: `Service request #${next.id} assigned from the customer request queue.`,
        attachmentsJson: next.attachments && next.attachments.length ? JSON.stringify(next.attachments) : null
      },
      actor.id
    );

    try {
      await sendConversationMessage(actor, {
        scope: getConversationScopeForRoles(actor.role, ROLES.CUSTOMER),
        receiverId: next.customerId,
        message: `Your service request #${next.id} has been assigned to ${next.assignedWorkerName || "a worker"}.`
      });
    } catch {
      // Notifications still reach the customer if direct chat is not allowed for this role.
    }
  }

  if (next.status === "cancelled") {
    const cancelMessage = `Your service request #${next.id} has been cancelled.${next.cancelReason ? ` Reason: ${next.cancelReason}` : ""}`;

    await createNotificationRecord({
      userId: next.customerId,
      message: cancelMessage,
      payloadJson: {
        type: "service_request.cancelled",
        serviceRequestId: next.id,
        cancelReason: next.cancelReason || null
      }
    });

    emitToUser(next.customerId, "notification:new", {
      type: "service_request.cancelled",
      serviceRequestId: next.id,
      cancelReason: next.cancelReason || null
    });

    try {
      await sendConversationMessage(actor, {
        scope: getConversationScopeForRoles(actor.role, ROLES.CUSTOMER),
        receiverId: next.customerId,
        message: cancelMessage
      });
    } catch {
      // Notifications still reach the customer if direct chat is not allowed for this role.
    }
  }

  if (next.status !== "cancelled") {
    await createNotificationRecord({
      userId: next.customerId,
      message: `Your service request #${next.id} is now ${next.status.replace("_", " ")}`,
      payloadJson: {
        type: "service_request.updated",
        serviceRequestId: next.id,
        status: next.status,
        assignedWorkerId: next.assignedWorkerId || null
      }
    });

    emitToUser(next.customerId, "notification:new", {
      type: "service_request.updated",
      serviceRequestId: next.id,
      status: next.status,
      assignedWorkerId: next.assignedWorkerId || null
    });
  }

  return next;
}

export async function listAssignableWorkers() {
  // Prefer any existing worker-facing users, even if the active flag is stale in the database.
  const allowedRoles = new Set([
    ROLES.FIELD_WORK,
    ROLES.VENDOR,
    ROLES.ELECTRICIAN,
    ROLES.SERVICE_PROFESSIONAL
  ]);

  const users = await listAllUsers();
  const workers = users.filter((user) => allowedRoles.has(user.role));

  if (workers.length) {
    return workers;
  }

  // Fallback to the active-role query if the users table is partially unavailable.
  return listUsersByRoles(Array.from(allowedRoles));
}
