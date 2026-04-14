import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../utils/constants.js";
import { logActivity } from "../repositories/activity.repository.js";
import { listAllUsers, updateUserRoleById } from "../repositories/user.repository.js";

export async function getUsers() {
  return listAllUsers();
}

export async function updateUserRole(actorId, userId, role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  const updated = await updateUserRoleById(userId, role);
  if (!updated) {
    throw new ApiError(404, "User not found");
  }

  await logActivity({
    actorId,
    action: "user.role.updated",
    entityType: "user",
    entityId: userId,
    metadata: { role }
  });

  return { success: true };
}
