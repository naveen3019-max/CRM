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

const categoryAliases = [
  { pattern: /\bplumber\b/i, category: "plumber" },
  { pattern: /\belectrician\b/i, category: "electrician" },
  { pattern: /\binternet\s*installation\b/i, category: "internet_installation" },
  { pattern: /\bcctv\b/i, category: "cctv_technician" },
  { pattern: /\bac\s*service\b/i, category: "ac_service" },
  { pattern: /\bcarpenter\b/i, category: "carpenter" },
  { pattern: /\bpainter\b/i, category: "painter" },
  { pattern: /\bappliance\s*repair\b/i, category: "appliance_repair" },
  { pattern: /\btechnician\b/i, category: "general_technician" }
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
  let detectedCategory = null;
  let remainingText = cleaned;

  for (const candidate of roleAliases) {
    if (candidate.pattern.test(remainingText)) {
      detectedRole = candidate.role;
      remainingText = remainingText.replace(candidate.pattern, " ");
      break;
    }
  }

  for (const candidate of categoryAliases) {
    if (candidate.pattern.test(remainingText)) {
      detectedCategory = candidate.category;
      remainingText = remainingText.replace(candidate.pattern, " ");
      break;
    }
  }

  const location = remainingText.replace(/\b(search|find|for|near|in|at)\b/g, " ").replace(/\s+/g, " ").trim();

  return {
    role: detectedRole,
    category: detectedCategory,
    location
  };
}

export async function searchChatUsers(actor, query, filters = {}) {
  const cleanedQuery = String(query || "").trim();
  if (!cleanedQuery) {
    return [];
  }

  const { role: parsedRole, category: parsedCategory, location } = parseSmartQuery(cleanedQuery);
  const allowedRoles = getAvailableChatRolesForRole(actor.role);

  let roles = allowedRoles;
  if (parsedRole) {
    if (!allowedRoles.includes(parsedRole)) {
      return [];
    }

    roles = [parsedRole];
  }

  // If a service category was detected, prefer searching service_professional role
  if (parsedCategory) {
    if (!allowedRoles.includes(ROLES.SERVICE_PROFESSIONAL)) {
      return [];
    }
    roles = [ROLES.SERVICE_PROFESSIONAL];
  }

  // If query includes an explicit role keyword (e.g. "sales"), don't force a free-text match on it.
  // Otherwise users whose name/email don't contain the keyword would be incorrectly excluded.
  let term = cleanedQuery;
  if (parsedRole || parsedCategory) {
    term = location || "";
  }

  const normalizedServiceCategory = filters.service_category || parsedCategory || "";

  return searchUsersByRoles({
    roles,
    excludedUserId: actor.id,
    location,
    term,
    city: filters.city || "",
    pincode: filters.pincode || "",
    experience: filters.experience || "",
    service_category: normalizedServiceCategory,
    limit: 10
  });
}