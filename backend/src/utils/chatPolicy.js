import { MESSAGE_SCOPE, ROLES } from "./constants.js";
import { ApiError } from "./ApiError.js";

const allowedScopes = {
  [MESSAGE_SCOPE.SALES_CUSTOMER]: [ROLES.SALES, ROLES.CUSTOMER],
  [MESSAGE_SCOPE.ADMIN_SALES]: [ROLES.ADMIN, ROLES.SALES],
  [MESSAGE_SCOPE.ADMIN_VENDOR]: [ROLES.ADMIN, ROLES.VENDOR],
  [MESSAGE_SCOPE.ADMIN_ELECTRICIAN]: [ROLES.ADMIN, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.ADMIN_FIELD_WORK]: [ROLES.ADMIN, ROLES.FIELD_WORK],
  [MESSAGE_SCOPE.VENDOR_ELECTRICIAN]: [ROLES.VENDOR, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.VENDOR_FIELD_WORK]: [ROLES.VENDOR, ROLES.FIELD_WORK],
  [MESSAGE_SCOPE.CUSTOMER_ELECTRICIAN]: [ROLES.CUSTOMER, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.SALES_ELECTRICIAN]: [ROLES.SALES, ROLES.ELECTRICIAN]
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

export function getAllowedScopesForRole(actorRole) {
  return Object.entries(allowedScopes)
    .filter(([, roles]) => roles.includes(actorRole))
    .map(([scope]) => scope);
}

export function getAvailableChatRolesForRole(actorRole) {
  if (actorRole === ROLES.ADMIN) {
    return Object.values(ROLES).filter((role) => role !== ROLES.ADMIN);
  }

  const scopes = getAllowedScopesForRole(actorRole);
  const roles = new Set();

  for (const scope of scopes) {
    for (const role of getCounterpartRoles(scope, actorRole)) {
      roles.add(role);
    }
  }

  roles.add(ROLES.ADMIN);
  roles.delete(actorRole);
  return Array.from(roles);
}
