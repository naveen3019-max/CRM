import * as workAssignmentRepository from "../repositories/workAssignment.repository.js";
import * as notificationRepository from "../repositories/notification.repository.js";
import * as chatRepository from "../repositories/chat.repository.js";
import { emitToUser } from "../sockets/state.js";
import { getIoInstance } from "../sockets/state.js";
import { ApiError } from "../utils/ApiError.js";
import { getConversationScopeForRoles } from "../utils/chatPolicy.js";

function hasSameUserId(leftValue, rightValue) {
  return String(leftValue) === String(rightValue);
}

export async function createWorkAssignment(payload, assignedByUserId) {
  if (!payload.workerId) throw new ApiError(400, "Worker ID is required");
  if (!payload.serviceTitle) throw new ApiError(400, "Service title is required");

  const assignmentId = await workAssignmentRepository.createWorkAssignmentRecord({
    workerId: payload.workerId,
    assignedById: assignedByUserId,
    customerId: payload.customerId || null,
    serviceTitle: payload.serviceTitle,
    serviceCategory: payload.serviceCategory || null,
    description: payload.description || null,
    location: payload.location || null,
    city: payload.city || null,
    areaPincode: payload.areaPincode || null,
    budget: payload.budget || null,
    priority: payload.priority || "normal",
    preferredDate: payload.preferredDate || null,
    preferredTime: payload.preferredTime || null,
    additionalInstructions: payload.additionalInstructions || null,
    attachmentsJson: payload.attachmentsJson || payload.attachments || null,
    status: "pending"
  });

  const assignment = await workAssignmentRepository.findWorkAssignmentById(assignmentId);
  const enrichedAssignment = {
    ...assignment,
    customerName: payload.customerName || assignment.customerName || null
  };

  await sendAssignmentNotificationToChat(enrichedAssignment, assignedByUserId);
  await createAssignmentNotification(enrichedAssignment);
  emitAssignmentNotificationToWorker(enrichedAssignment);

  return enrichedAssignment;
}

export async function getWorkAssignmentById(assignmentId) {
  const assignment = await workAssignmentRepository.findWorkAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Work assignment not found");
  }
  return assignment;
}

export async function listAssignmentsForWorker(workerId, status = null) {
  return await workAssignmentRepository.listWorkAssignmentsByWorker(workerId, status);
}

export async function listAssignmentsCreatedByAdmin(adminId, status = null) {
  return await workAssignmentRepository.listWorkAssignmentsByAdmin(adminId, status);
}

export async function listAllWorkAssignments(status = null, limit = 100, offset = 0) {
  return await workAssignmentRepository.listAllWorkAssignments(status, limit, offset);
}

export async function acceptWorkAssignment(assignmentId, workerId) {
  const assignment = await getWorkAssignmentById(assignmentId);

  // Verify worker is the assigned worker
  if (!hasSameUserId(assignment.workerId, workerId)) {
    throw new ApiError(403, "You are not authorized to accept this assignment");
  }

  // Check if assignment is still pending
  if (assignment.status !== "pending") {
    throw new ApiError(
      400,
      `Cannot accept assignment with status: ${assignment.status}`
    );
  }

  // Update status to accepted
  const updated = await workAssignmentRepository.updateWorkAssignmentStatus(
    assignmentId,
    "accepted",
    "worker_response_at"
  );

  if (!updated) {
    throw new ApiError(500, "Failed to accept assignment");
  }

  // Send acceptance notification to admin/sales
  await sendAssignmentStatusUpdateToChat(
    assignmentId,
    "accepted",
    workerId,
    assignment
  );

  // Create notification for admin
  await createAssignmentStatusNotification(assignment, "accepted", workerId);

  // Emit realtime event
  emitAssignmentStatusUpdateToAdmin(assignmentId, "accepted", workerId);

  return await getWorkAssignmentById(assignmentId);
}

export async function rejectWorkAssignment(assignmentId, workerId, rejectionReason = null) {
  const assignment = await getWorkAssignmentById(assignmentId);

  // Verify worker is the assigned worker
  if (!hasSameUserId(assignment.workerId, workerId)) {
    throw new ApiError(403, "You are not authorized to reject this assignment");
  }

  // Check if assignment is still pending
  if (assignment.status !== "pending") {
    throw new ApiError(
      400,
      `Cannot reject assignment with status: ${assignment.status}`
    );
  }

  // Update status to rejected
  const updated = await workAssignmentRepository.updateWorkAssignmentStatus(
    assignmentId,
    "rejected",
    "worker_response_at"
  );

  if (!updated) {
    throw new ApiError(500, "Failed to reject assignment");
  }

  // Send rejection notification to admin/sales
  await sendAssignmentStatusUpdateToChat(
    assignmentId,
    "rejected",
    workerId,
    assignment,
    rejectionReason
  );

  // Create notification for admin
  await createAssignmentStatusNotification(
    assignment,
    "rejected",
    workerId,
    rejectionReason
  );

  // Emit realtime event
  emitAssignmentStatusUpdateToAdmin(assignmentId, "rejected", workerId);

  return await getWorkAssignmentById(assignmentId);
}

export async function updateAssignmentStatus(assignmentId, newStatus, updatedByUserId) {
  const assignment = await getWorkAssignmentById(assignmentId);

  // Verify updater is admin/sales who created the assignment
  if (!hasSameUserId(assignment.assignedById, updatedByUserId)) {
    throw new ApiError(
      403,
      "Only the assigning admin/sales can update status"
    );
  }

  const validStatuses = ["pending", "accepted", "in_progress", "completed", "rejected"];
  if (!validStatuses.includes(newStatus)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Update status
  const updated = await workAssignmentRepository.updateWorkAssignmentStatus(
    assignmentId,
    newStatus,
    newStatus === "completed" ? "completed_at" : null
  );

  if (!updated) {
    throw new ApiError(500, "Failed to update assignment status");
  }

  // Send status update notification to worker
  await sendAssignmentStatusUpdateToChat(assignmentId, newStatus, updatedByUserId, assignment);

  // Create notification
  await createAssignmentStatusNotification(assignment, newStatus, updatedByUserId);

  // Emit realtime event
  emitAssignmentStatusUpdateToWorker(assignmentId, newStatus);

  return await getWorkAssignmentById(assignmentId);
}

export async function completeWorkAssignmentWithProof(assignmentId, workerId, files = [], note = null) {
  const assignment = await getWorkAssignmentById(assignmentId);

  if (!hasSameUserId(assignment.workerId, workerId)) {
    throw new ApiError(403, "You are not authorized to complete this assignment");
  }

  if (!files || !files.length) {
    throw new ApiError(400, "At least one proof file is required");
  }

  if (!['accepted', 'in_progress'].includes(String(assignment.status))) {
    throw new ApiError(400, "You can only complete accepted or in-progress assignments");
  }

  const proofRecords = files.map((file) => ({
    url: `/uploads/${file.filename}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: workerId,
    note: note || null,
    uploadedAt: new Date().toISOString()
  }));

  await workAssignmentRepository.updateWorkAssignmentRecord(assignmentId, {
    proof_json: JSON.stringify(proofRecords),
    status: "completed",
    completed_at: new Date()
  });

  const updatedAssignment = await getWorkAssignmentById(assignmentId);
  const conversationScope = getConversationScopeForRoles(
    updatedAssignment.assignedByRole || "admin",
    updatedAssignment.workerRole || "field_work"
  );

  let chat = await chatRepository.findConversation(
    conversationScope,
    updatedAssignment.assignedById,
    updatedAssignment.workerId
  );

  if (!chat) {
    const conversationId = await chatRepository.createConversationRecord(
      conversationScope,
      updatedAssignment.assignedById,
      updatedAssignment.workerId
    );
    chat = { id: conversationId };
  }

  const summaryMessage = [
    "Work Completed With Proof",
    `Assignment: ${updatedAssignment.serviceTitle}`,
    `Status: Completed by ${updatedAssignment.workerName || "worker"}`,
    `Proof files: ${proofRecords.length}`,
    note ? `Note: ${note}` : null
  ].filter(Boolean).join("\n");

  const summaryMessageId = await chatRepository.createMessageRecord({
    conversationId: chat.id,
    senderId: workerId,
    receiverId: updatedAssignment.assignedById,
    messageBody: summaryMessage
  });

  const payloadCreatedAt = new Date().toISOString();

  emitToUser(updatedAssignment.assignedById, "chat:message", {
    id: summaryMessageId,
    conversationId: chat.id,
    senderId: workerId,
    receiverId: updatedAssignment.assignedById,
    messageBody: summaryMessage,
    originalMessage: summaryMessage,
    originalLanguage: null,
    translatedMessages: {},
    createdAt: payloadCreatedAt
  });

  emitToUser(workerId, "chat:message", {
    id: summaryMessageId,
    conversationId: chat.id,
    senderId: workerId,
    receiverId: updatedAssignment.assignedById,
    messageBody: summaryMessage,
    originalMessage: summaryMessage,
    originalLanguage: null,
    translatedMessages: {},
    createdAt: payloadCreatedAt
  });

  for (const proof of proofRecords) {
    const proofMessageId = await chatRepository.createMessageRecord({
      conversationId: chat.id,
      senderId: workerId,
      receiverId: updatedAssignment.assignedById,
      messageBody: `Completion proof: ${proof.fileName}`,
      imageUrl: proof.mimeType.startsWith("image/") ? proof.url : null
    });

    const proofPayload = {
      id: proofMessageId,
      conversationId: chat.id,
      senderId: workerId,
      receiverId: updatedAssignment.assignedById,
      messageBody: `Completion proof: ${proof.fileName}`,
      originalMessage: `Completion proof: ${proof.fileName}`,
      originalLanguage: null,
      translatedMessages: {},
      imageUrl: proof.mimeType.startsWith("image/") ? proof.url : null,
      createdAt: payloadCreatedAt
    };

    emitToUser(updatedAssignment.assignedById, "chat:message", proofPayload);
    emitToUser(workerId, "chat:message", proofPayload);
  }

  await createAssignmentStatusNotification(updatedAssignment, "completed", workerId);
  emitAssignmentStatusUpdateToAdmin(assignmentId, "completed", workerId);

  await notificationRepository.createNotificationRecord({
    userId: updatedAssignment.assignedById,
    message: `Work completed with proof for ${updatedAssignment.serviceTitle}`,
    payloadJson: {
      type: "assignment.completed_with_proof",
      relatedEntityType: "work_assignment",
      relatedEntityId: updatedAssignment.id
    }
  });

  emitToUser(updatedAssignment.assignedById, "notification:new", {
    type: "assignment.completed_with_proof",
    relatedEntityType: "work_assignment",
    relatedEntityId: updatedAssignment.id
  });

  return await getWorkAssignmentById(assignmentId);
}

// ===== Helper Functions =====

async function sendAssignmentNotificationToChat(assignment, senderUserId) {
  try {
    const conversationScope = getConversationScopeForRoles(
      assignment.assignedByRole || "admin",
      assignment.workerRole || "field_work"
    );

    let chat = await chatRepository.findConversation(
      conversationScope,
      senderUserId,
      assignment.workerId
    );

    if (!chat) {
      const chatId = await chatRepository.createConversationRecord(
        conversationScope,
        senderUserId,
        assignment.workerId
      );
      chat = { id: chatId };
    }

    const scheduleParts = [];
    if (assignment.preferredDate) {
      scheduleParts.push(String(assignment.preferredDate));
    }
    if (assignment.preferredTime) {
      scheduleParts.push(String(assignment.preferredTime));
    }

    const lines = ["Work Assignment Notice"];
    if (assignment.customerName) {
      lines.push(`Customer: ${assignment.customerName}`);
    }
    lines.push(`Service: ${assignment.serviceTitle}`);

    const locationParts = [assignment.location, assignment.city, assignment.areaPincode].filter(Boolean).map((part) => String(part).trim());
    if (locationParts.length) {
      lines.push(`Location: ${locationParts.join(", ")}`);
    }

    if (assignment.description) {
      lines.push(`Details: ${String(assignment.description).trim()}`);
    }

    if (scheduleParts.length) {
      lines.push(`Preferred Schedule: ${scheduleParts.join(" ")}`);
    }

    if (assignment.priority) {
      lines.push(`Priority: ${String(assignment.priority).toUpperCase()}`);
    }

    if (Array.isArray(assignment.attachmentsJson) && assignment.attachmentsJson.length > 0) {
      lines.push(`Attachments: ${assignment.attachmentsJson.length} file(s)`);
    }

    if (assignment.additionalInstructions) {
      lines.push(`Instructions: ${String(assignment.additionalInstructions).trim()}`);
    }

    lines.push("Please review this assignment in your dashboard and accept or reject it.");

    const messageContent = lines.join("\n");

    // Save message with assignment metadata
    const messageId = await chatRepository.createMessageRecord({
      conversationId: chat.id,
      senderId: senderUserId,
      receiverId: assignment.workerId,
      messageBody: messageContent
    });

    return messageId;
  } catch (error) {
    console.error("Failed to send assignment notification to chat:", error);
    // Don't throw - assignment was already created
  }
}

async function sendAssignmentStatusUpdateToChat(
  assignmentId,
  newStatus,
  updatedByUserId,
  assignment,
  rejectionReason = null
) {
  try {
    const conversationScope = getConversationScopeForRoles(
      assignment.assignedByRole || "admin",
      assignment.workerRole || "field_work"
    );

    // Find chat between updater and relevant user
    const targetUserId = newStatus === "accepted" || newStatus === "rejected"
      ? assignment.assignedById
      : assignment.workerId;

    let chat = await chatRepository.findConversation(
      conversationScope,
      updatedByUserId,
      targetUserId
    );

    if (!chat) {
      const conversationId = await chatRepository.createConversationRecord(
        conversationScope,
        updatedByUserId,
        targetUserId
      );
      chat = { id: conversationId };
    }

    const statusMessages = {
      accepted: "The worker accepted this assignment.",
      rejected: `The worker rejected this assignment${rejectionReason ? ` (Reason: ${rejectionReason})` : ""}.`,
      in_progress: "Work has started on this assignment.",
      completed: "The assignment has been completed."
    };

    const message = statusMessages[newStatus] || `Assignment status updated to ${newStatus}.`;
    const messageContent = [
      "Assignment Status Update",
      `Status: ${message}`,
      `Assignment: ${assignment.serviceTitle}`
    ].join("\n");

    const messageId = await chatRepository.createMessageRecord({
      conversationId: chat.id,
      senderId: updatedByUserId,
      receiverId: targetUserId,
      messageBody: messageContent
    });

    const messagePayload = {
      id: messageId,
      conversationId: chat.id,
      senderId: updatedByUserId,
      receiverId: targetUserId,
      messageBody: messageContent,
      originalMessage: messageContent,
      originalLanguage: null,
      translatedMessages: {},
      createdAt: new Date().toISOString()
    };

    emitToUser(updatedByUserId, "chat:message", messagePayload);
    emitToUser(targetUserId, "chat:message", messagePayload);
  } catch (error) {
    console.error("Failed to send status update to chat:", error);
  }
}

async function createAssignmentNotification(assignment) {
  try {
    const notificationContent = `New work assignment: ${assignment.serviceTitle}${assignment.location ? ` in ${assignment.location}` : ""}`;

    await notificationRepository.createNotificationRecord({
      userId: assignment.workerId,
      message: notificationContent,
      payloadJson: {
        type: "assignment:new",
        relatedEntityType: "work_assignment",
        relatedEntityId: assignment.id,
        actionLink: `/dashboard/assignments/${assignment.id}`
      }
    });
  } catch (error) {
    console.error("Failed to create assignment notification:", error);
  }
}

async function createAssignmentStatusNotification(
  assignment,
  newStatus,
  updatedByUserId,
  rejectionReason = null
) {
  try {
    const statusNotifications = {
      accepted: `Worker ${assignment.workerName} accepted: ${assignment.serviceTitle}`,
      rejected: `Worker ${assignment.workerName} rejected: ${assignment.serviceTitle}${rejectionReason ? ` - ${rejectionReason}` : ""}`,
      in_progress: `Worker started: ${assignment.serviceTitle}`,
      completed: `Worker completed: ${assignment.serviceTitle}`
    };

    const content = statusNotifications[newStatus] || `Assignment status updated to ${newStatus}`;

    await notificationRepository.createNotificationRecord({
      userId: assignment.assignedById,
      message: content,
      payloadJson: {
        type: `assignment:${newStatus}`,
        relatedEntityType: "work_assignment",
        relatedEntityId: assignment.id,
        actionLink: `/admin/assignments/${assignment.id}`,
        rejectionReason
      }
    });
  } catch (error) {
    console.error("Failed to create status notification:", error);
  }
}

function emitAssignmentNotificationToWorker(assignment) {
  try {
    const io = getIoInstance();
    if (io) {
      io.to(`user:${assignment.workerId}`).emit("assignment:new", {
        id: assignment.id,
        serviceTitle: assignment.serviceTitle,
        serviceCategory: assignment.serviceCategory,
        location: assignment.location,
        city: assignment.city,
        priority: assignment.priority,
        description: assignment.description,
        assignedByName: assignment.assignedByName,
        createdAt: assignment.createdAt
      });
    }
  } catch (error) {
    console.error("Failed to emit assignment notification to worker:", error);
  }
}

function emitAssignmentStatusUpdateToAdmin(assignmentId, status, workerId) {
  try {
    const io = getIoInstance();
    if (io) {
      io.emit("assignment:status_update", {
        id: assignmentId,
        status: status,
        workerId: workerId,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error("Failed to emit status update:", error);
  }
}

function emitAssignmentStatusUpdateToWorker(assignmentId, status) {
  try {
    const io = getIoInstance();
    if (io) {
      io.emit("assignment:status_update", {
        id: assignmentId,
        status: status,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error("Failed to emit status update to worker:", error);
  }
}
