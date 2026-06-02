const CHAT_ROLE_ALIASES = new Map([
  ["field_work", "field_work"],
  ["service_professional", "field_work"],
  ["worker", "field_work"],
  ["other_worker", "field_work"],
  // Support mapping of specific service category roles (e.g. plumber, carpenter)
  ["plumber", "field_work"],
  ["internet_installation", "field_work"],
  ["cctv_technician", "field_work"],
  ["ac_service", "field_work"],
  ["carpenter", "field_work"],
  ["painter", "field_work"],
  ["appliance_repair", "field_work"],
  ["general_technician", "field_work"]
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
      expanded.add("worker");
      expanded.add("other_worker");
      expanded.add("plumber");
      expanded.add("internet_installation");
      expanded.add("cctv_technician");
      expanded.add("ac_service");
      expanded.add("carpenter");
      expanded.add("painter");
      expanded.add("appliance_repair");
      expanded.add("general_technician");
    }
  }

  return Array.from(expanded);
}