const CHAT_ROLE_ALIASES = new Map([
  ["field_work", "field_work"],
  ["service_professional", "field_work"],
  ["worker", "field_work"],
  ["other_worker", "field_work"]
]);

export function normalizeRole(role) {
  if (role === null || role === undefined) {
    return "";
  }

  const lowered = String(role).trim().toLowerCase();
  return CHAT_ROLE_ALIASES.get(lowered) || lowered;
}

export function rolesMatch(leftRole, rightRole) {
  return normalizeRole(leftRole) === normalizeRole(rightRole);
}

export function expandChatRoles(roles = []) {
  const expanded = new Set();

  for (const role of roles) {
    const normalized = normalizeRole(role);
    if (!normalized) {
      continue;
    }

    expanded.add(normalized);

    if (normalized === "field_work") {
      expanded.add("service_professional");
    }
  }

  return Array.from(expanded);
}