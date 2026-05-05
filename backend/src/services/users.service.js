import { searchUsersByRoles } from "../repositories/user.repository.js";
import { getAvailableChatRolesForRole } from "../utils/chatPolicy.js";
import { ROLES } from "../utils/constants.js";

const roleAliases = [
  { pattern: /\bfield\s*work\b/i, role: ROLES.FIELD_WORK },
  { pattern: /\bfieldwork\b/i, role: ROLES.FIELD_WORK },
  { pattern: /\belectrician\b/i, role: ROLES.ELECTRICIAN },
  { pattern: /\bvendor\b/i, role: ROLES.VENDOR },
  { pattern: /\bcustomer\b/i, role: ROLES.CUSTOMER },
  { pattern: /\bsales\b/i, role: ROLES.SALES },
  { pattern: /\badmin\b/i, role: ROLES.ADMIN }
];

function normalizeTokens(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSmartQuery(query) {
  const cleaned = normalizeTokens(query);
  let detectedRole = null;
  let remainingText = cleaned;

  for (const candidate of roleAliases) {
    if (candidate.pattern.test(remainingText)) {
      detectedRole = candidate.role;
      remainingText = remainingText.replace(candidate.pattern, " ");
      break;
    }
  }

  const location = remainingText.replace(/\b(search|find|for|near|in|at)\b/g, " ").replace(/\s+/g, " ").trim();

  return {
    role: detectedRole,
    location
  };
}

export async function searchChatUsers(actor, query) {
  const cleanedQuery = String(query || "").trim();
  if (!cleanedQuery) {
    return [];
  }

  const { role: parsedRole, location } = parseSmartQuery(cleanedQuery);
  const allowedRoles = getAvailableChatRolesForRole(actor.role);

  let roles = allowedRoles;
  if (parsedRole) {
    if (!allowedRoles.includes(parsedRole)) {
      return [];
    }

    roles = [parsedRole];
  }

  return searchUsersByRoles({
    roles,
    excludedUserId: actor.id,
    location,
    term: cleanedQuery,
    limit: 10
  });
}