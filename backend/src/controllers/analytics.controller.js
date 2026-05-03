import { asyncHandler } from "../utils/asyncHandler.js";
import { 
  fetchAdminOverview, 
  fetchSalesOverview, 
  fetchSystemHealth, 
  fetchVendorPerformance, 
  fetchRecentActivity 
} from "../services/analytics.service.js";

export const getAdminOverview = asyncHandler(async (req, res) => {
  const metrics = await fetchAdminOverview();
  res.json({ success: true, data: metrics });
});

export const getSalesOverview = asyncHandler(async (req, res) => {
  const metrics = await fetchSalesOverview(req.user.id);
  res.json({ success: true, data: metrics });
});

export const getSystemHealth = asyncHandler(async (req, res) => {
  const data = await fetchSystemHealth();
  res.json({ success: true, data });
});

export const getVendorPerformance = asyncHandler(async (req, res) => {
  const data = await fetchVendorPerformance();
  res.json({ success: true, data });
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const data = await fetchRecentActivity();
  res.json({ success: true, data });
});
