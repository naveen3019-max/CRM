import apiClient from "./apiClient";

const availableUsersCache = new Map();

export async function getAvailableUsers(token) {
  if (!token) {
    return [];
  }

  if (availableUsersCache.has(token)) {
    return availableUsersCache.get(token);
  }

  const response = await apiClient.get("/chat/available-users");
  const users = response.data?.data || [];
  availableUsersCache.set(token, users);
  return users;
}

export function clearAvailableUsersCache(token) {
  if (token) {
    availableUsersCache.delete(token);
    return;
  }

  availableUsersCache.clear();
}