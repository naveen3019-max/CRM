import { asyncHandler } from "../utils/asyncHandler.js";
import { fetchAdminOverview, fetchSalesOverview } from "../services/analytics.service.js";

export const getAdminOverview = asyncHandler(async (req, res) => {
  const metrics = await fetchAdminOverview();
  res.json({ success: true, data: metrics });
});

export const getSalesOverview = asyncHandler(async (req, res) => {
  const metrics = await fetchSalesOverview(req.user.id);
  res.json({ success: true, data: metrics });
});
