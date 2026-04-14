import { ApiError } from "../utils/ApiError.js";
import { LEAD_STATUS, ROLES } from "../utils/constants.js";
import { emitToUser } from "../sockets/state.js";
import { logActivity } from "../repositories/activity.repository.js";
import {
  addLeadNote,
  assignLeadToSales,
  createLeadRecord,
  deleteLeadRecord,
  findLeadById,
  listLeadRecords,
  updateLeadRecord
} from "../repositories/lead.repository.js";
import { createNotificationRecord } from "../repositories/notification.repository.js";

export async function createLead(actor, payload) {
  const status = payload.status || LEAD_STATUS.NEW;
  const leadId = await createLeadRecord({
    ...payload,
    status,
    createdBy: actor.id
  });

  await logActivity({
    actorId: actor.id,
    action: "lead.created",
    entityType: "lead",
    entityId: leadId,
    metadata: { status }
  });

  return findLeadById(leadId);
}

export async function getLeads(actor, query) {
  const limit = Number(query.limit || 25);
  const offset = Number(query.offset || 0);

  let assignedSalesId = query.assignedSalesId;
  let customerId = query.customerId;

  if (actor.role === ROLES.SALES) {
    assignedSalesId = actor.id;
  }

  if (actor.role === ROLES.CUSTOMER) {
    customerId = actor.id;
  }

  return listLeadRecords({
    assignedSalesId,
    customerId,
    status: query.status,
    q: query.q,
    limit,
    offset
  });
}

export async function getLead(actor, leadId) {
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (actor.role === ROLES.SALES && lead.assignedSalesId !== actor.id) {
    throw new ApiError(403, "You can only view your assigned leads");
  }

  if (actor.role === ROLES.CUSTOMER && lead.customerId !== actor.id) {
    throw new ApiError(403, "You can only view your own leads");
  }

  return lead;
}

export async function updateLead(actor, leadId, payload) {
  const existingLead = await findLeadById(leadId);
  if (!existingLead) {
    throw new ApiError(404, "Lead not found");
  }

  if (actor.role === ROLES.SALES && existingLead.assignedSalesId !== actor.id) {
    throw new ApiError(403, "You can only modify your assigned leads");
  }

  const mappedFields = {
    status: payload.status,
    source: payload.source,
    title: payload.title,
    budget: payload.budget
  };

  await updateLeadRecord(leadId, mappedFields);

  await logActivity({
    actorId: actor.id,
    action: "lead.updated",
    entityType: "lead",
    entityId: leadId,
    metadata: mappedFields
  });

  return findLeadById(leadId);
}

export async function assignLead(actor, leadId, salesId) {
  const updated = await assignLeadToSales(leadId, salesId);
  if (!updated) {
    throw new ApiError(404, "Lead not found");
  }

  await createNotificationRecord({
    userId: salesId,
    message: `A lead has been assigned to you (Lead #${leadId})`,
    payloadJson: { leadId, type: "lead.assigned" }
  });

  emitToUser(salesId, "notification:new", {
    type: "lead.assigned",
    leadId
  });

  await logActivity({
    actorId: actor.id,
    action: "lead.assigned",
    entityType: "lead",
    entityId: leadId,
    metadata: { salesId }
  });

  return { success: true };
}

export async function addNote(actor, leadId, payload) {
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (actor.role === ROLES.SALES && lead.assignedSalesId !== actor.id) {
    throw new ApiError(403, "Cannot add note to unassigned lead");
  }

  const noteId = await addLeadNote({
    leadId,
    salesId: actor.id,
    note: payload.note,
    followUpAt: payload.followUpAt
  });

  return { noteId };
}

export async function removeLead(actorId, leadId) {
  const deleted = await deleteLeadRecord(leadId);
  if (!deleted) {
    throw new ApiError(404, "Lead not found");
  }

  await logActivity({
    actorId,
    action: "lead.deleted",
    entityType: "lead",
    entityId: leadId
  });

  return { success: true };
}
