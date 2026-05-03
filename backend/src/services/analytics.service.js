import { 
  getAdminMetrics, 
  getSalesMetrics, 
  getSystemHealth, 
  getVendorPerformance, 
  getRecentActivity 
} from "../repositories/analytics.repository.js";

export async function fetchAdminOverview() {
  return getAdminMetrics();
}

export async function fetchSalesOverview(userId) {
  return getSalesMetrics(userId);
}

export async function fetchSystemHealth() {
  return getSystemHealth();
}

export async function fetchVendorPerformance() {
  return getVendorPerformance();
}

export async function fetchRecentActivity() {
  return getRecentActivity();
}
