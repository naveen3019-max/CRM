import { ApiError } from "../utils/ApiError.js";
import { PROJECT_STATUS, ROLES } from "../utils/constants.js";
import {
  createProjectOrderRecord,
  listProjectOrderRecords,
  updateProjectOrderRecord
} from "../repositories/project.repository.js";

export async function listProjects(actor, query) {
  const filters = {
    customerId: query.customerId ? Number(query.customerId) : undefined,
    vendorId: query.vendorId ? Number(query.vendorId) : undefined,
    status: query.status
  };

  if (actor.role === ROLES.CUSTOMER) {
    filters.customerId = actor.id;
  }

  if (actor.role === ROLES.VENDOR) {
    filters.vendorId = actor.id;
  }

  return listProjectOrderRecords(filters);
}

export async function createProject(payload) {
  const status = payload.status || PROJECT_STATUS.PENDING;
  const id = await createProjectOrderRecord({
    ...payload,
    status
  });
  return { id };
}

export async function updateProject(id, payload) {
  if (payload.status && !Object.values(PROJECT_STATUS).includes(payload.status)) {
    throw new ApiError(400, "Invalid project status");
  }

  const updated = await updateProjectOrderRecord(id, {
    status: payload.status,
    vendor_id: payload.vendorId,
    total_amount: payload.totalAmount,
    start_date: payload.startDate,
    end_date: payload.endDate
  });

  if (!updated) {
    throw new ApiError(404, "Project/order not found");
  }

  return { success: true };
}
