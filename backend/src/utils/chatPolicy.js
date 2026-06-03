import { MESSAGE_SCOPE, ROLES } from "./constants.js";
import { ApiError } from "./ApiError.js";
import { expandChatRoles, normalizeRole, rolesMatch } from "./roleUtils.js";

const allowedScopes = {
  [MESSAGE_SCOPE.SALES_CUSTOMER]: [ROLES.SALES, ROLES.CUSTOMER],
  [MESSAGE_SCOPE.ADMIN_SALES]: [ROLES.ADMIN, ROLES.SALES],
  [MESSAGE_SCOPE.ADMIN_VENDOR]: [ROLES.ADMIN, ROLES.VENDOR],
  [MESSAGE_SCOPE.ADMIN_ELECTRICIAN]: [ROLES.ADMIN, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.ADMIN_CUSTOMER]: [ROLES.ADMIN, ROLES.CUSTOMER],
  [MESSAGE_SCOPE.ADMIN_FIELD_WORK]: [ROLES.ADMIN, ROLES.FIELD_WORK],
  [MESSAGE_SCOPE.SALES_FIELD_WORK]: [ROLES.SALES, ROLES.FIELD_WORK],
  [MESSAGE_SCOPE.SALES_VENDOR]: [ROLES.SALES, ROLES.VENDOR],
  [MESSAGE_SCOPE.VENDOR_ELECTRICIAN]: [ROLES.VENDOR, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.VENDOR_CUSTOMER]: [ROLES.VENDOR, ROLES.CUSTOMER],
  [MESSAGE_SCOPE.VENDOR_FIELD_WORK]: [ROLES.VENDOR, ROLES.FIELD_WORK],
  [MESSAGE_SCOPE.CUSTOMER_ELECTRICIAN]: [ROLES.CUSTOMER, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.SALES_ELECTRICIAN]: [ROLES.SALES, ROLES.ELECTRICIAN],
  [MESSAGE_SCOPE.ADMIN_SERVICE_PROFESSIONAL]: [ROLES.ADMIN, ROLES.SERVICE_PROFESSIONAL],
  [MESSAGE_SCOPE.SALES_SERVICE_PROFESSIONAL]: [ROLES.SALES, ROLES.SERVICE_PROFESSIONAL],
  [MESSAGE_SCOPE.VENDOR_SERVICE_PROFESSIONAL]: [ROLES.VENDOR, ROLES.SERVICE_PROFESSIONAL],
};

export function validateConversationScope(scope, roleA, roleB) {
  const allowed = allowedScopes[scope];
  if (!allowed) {
    throw new ApiError(400, "Unsupported chat scope");
  }

  const providedA = normalizeRole(roleA);
  const providedB = normalizeRole(roleB);
  const allowedA = normalizeRole(allowed[0]);
  const allowedB = normalizeRole(allowed[1]);

  const provided = [providedA, providedB].sort().join(":");
  const expected = [allowedA, allowedB].sort().join(":");

  if (provided !== expected) {
    console.debug("[chatPolicy] scope denied", {
      scope,
      roleA: providedA,
      roleB: providedB,
      expected,
      provided
    });
    throw new ApiError(403, "Chat scope is not allowed for these roles");
  }
}

export function getCounterpartRoles(scope, actorRole) {
  const allowed = allowedScopes[scope];
  if (!allowed) {
    throw new ApiError(400, "Unsupported chat scope");
  }

  const normalizedActorRole = normalizeRole(actorRole);
  if (!expandChatRoles(allowed).some((role) => rolesMatch(role, normalizedActorRole))) {
    throw new ApiError(403, "Chat scope is not allowed for this role");
  }

  return expandChatRoles(allowed).filter((role) => !rolesMatch(role, normalizedActorRole));
}

export function getAllowedScopesForRole(actorRole) {
  const normalizedActorRole = normalizeRole(actorRole);
  return Object.entries(allowedScopes)
    .filter(([, roles]) => expandChatRoles(roles).some((role) => rolesMatch(role, normalizedActorRole)))
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

export function getConversationScopeForRoles(roleA, roleB) {
  const providedA = normalizeRole(roleA);
  const providedB = normalizeRole(roleB);
  const provided = [providedA, providedB].sort().join(":");

  for (const [scope, roles] of Object.entries(allowedScopes)) {
    const expected = [normalizeRole(roles[0]), normalizeRole(roles[1])].sort().join(":");
    if (provided === expected) {
      return scope;
    }
  }

  throw new ApiError(403, "Chat scope is not allowed for these roles");
}
