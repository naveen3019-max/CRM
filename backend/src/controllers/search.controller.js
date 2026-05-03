import { asyncHandler } from "../utils/asyncHandler.js";
import { globalSearch } from "../services/search.service.js";

export const performGlobalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json({ success: true, data: [] });
  }
  const results = await globalSearch(q);
  res.json({ success: true, data: results });
});
