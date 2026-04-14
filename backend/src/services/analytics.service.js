import { getAdminMetrics, getSalesMetrics } from "../repositories/analytics.repository.js";

export async function fetchAdminOverview() {
  return getAdminMetrics();
}

export async function fetchSalesOverview(userId) {
  return getSalesMetrics(userId);
}
