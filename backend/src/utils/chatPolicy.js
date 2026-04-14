import { MESSAGE_SCOPE, ROLES } from "./constants.js";
import { ApiError } from "./ApiError.js";

const allowedScopes = {
  [MESSAGE_SCOPE.SALES_CUSTOMER]: [ROLES.SALES, ROLES.CUSTOMER],
  [MESSAGE_SCOPE.ADMIN_SALES]: [ROLES.ADMIN, ROLES.SALES],
  [MESSAGE_SCOPE.ADMIN_VENDOR]: [ROLES.ADMIN, ROLES.VENDOR],
  [MESSAGE_SCOPE.ADMIN_ELECTRICIAN]: [ROLES.ADMIN, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.ADMIN_FIELD_WORK]: [ROLES.ADMIN, ROLES.FIELD_WORK]
};

export function validateConversationScope(scope, roleA, roleB) {
  const allowed = allowedScopes[scope];
  if (!allowed) {
    throw new ApiError(400, "Unsupported chat scope");
  }

  const provided = [roleA, roleB].sort().join(":");
  const expected = [...allowed].sort().join(":");

  if (provided !== expected) {
    throw new ApiError(403, "Chat scope is not allowed for these roles");
  }
}

export function getCounterpartRoles(scope, actorRole) {
  const allowed = allowedScopes[scope];
  if (!allowed) {
    throw new ApiError(400, "Unsupported chat scope");
  }

  if (!allowed.includes(actorRole)) {
    throw new ApiError(403, "Chat scope is not allowed for this role");
  }

  return allowed.filter((role) => role !== actorRole);
}
