import { ApiError } from "../utils/ApiError.js";
import { emitToUser } from "../sockets/state.js";
import * as commRepo from "../repositories/communication.repository.js";
import { logActivity } from "../repositories/activity.repository.js";
export async function getLeadCommunicationContext(leadId) {
  const context = await commRepo.findCommunicationContext(leadId);
  if (!context) throw new ApiError(404, "Lead not found");

  const messages = await commRepo.listLeadMessages(leadId);
  const logs = await commRepo.getLeadActivityLogs(leadId);

  return { context, messages, logs };
}

export async function sendStructuredMessage(actor, leadId, payload) {
  let conversation = await commRepo.findConversationByLead(leadId);
  
  if (!conversation) {
    // Determine the participants based on the lead context
    const context = await commRepo.findCommunicationContext(leadId);
    // Standard scope for lead communication: sales_customer or similar
    // For now, let's assume sales_customer if actor is sales or customer
    const scope = (actor.role === 'admin' || actor.role === 'sales') ? 'sales_customer' : 'sales_customer';
    const receiverId = actor.id === context.customer_id ? context.assigned_sales_id : context.customer_id;
    
    if (!receiverId) throw new ApiError(400, "Cannot start conversation: No counterpart assigned");

    const convId = await commRepo.createLeadConversation(leadId, scope, actor.id, receiverId);
    conversation = { id: convId, participantLowId: Math.min(actor.id, receiverId), participantHighId: Math.max(actor.id, receiverId) };
  }

  const receiverId = actor.id === conversation.participantLowId ? conversation.participantHighId : conversation.participantLowId;

  const messageId = await commRepo.createStructuredMessage({
    conversationId: conversation.id,
    senderId: actor.id,
    receiverId,
    body: payload.body,
    type: payload.type || 'text',
    metadata: payload.metadata || {}
  });

  const messageData = {
    id: messageId,
    conversationId: conversation.id,
    senderId: actor.id,
    receiverId,
    messageBody: payload.body,
    type: payload.type || 'text',
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString()
  };

  emitToUser(actor.id, "chat:message", messageData);
  emitToUser(receiverId, "chat:message", messageData);

  return messageData;
}

export async function updateLeadOperations(actor, leadId, data) {
  await commRepo.updateLeadOperationalData(leadId, data);

  // Create a system event message if critical data changed
  let eventMsg = "";
  if (data.scheduled_at) eventMsg = `Visit scheduled for ${new Date(data.scheduled_at).toLocaleString()}`;
  if (data.assigned_vendor_id) eventMsg = `Vendor reassigned`;

  if (eventMsg) {
    await sendStructuredMessage(actor, leadId, {
      body: eventMsg,
      type: 'system_event',
      metadata: { action: 'update_ops', fields: Object.keys(data) }
    });
  }

  await logActivity({
    actorId: actor.id,
    action: "UPDATE_OPERATIONS",
    entityType: "lead",
    entityId: leadId,
    metadata: data
  });

  return { success: true };
}
