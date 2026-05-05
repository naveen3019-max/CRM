import { asyncHandler } from "../utils/asyncHandler.js";
import { searchChatUsers } from "../services/users.service.js";

export const searchUsers = asyncHandler(async (req, res) => {
  const { query = "" } = req.query;
  if (!String(query).trim()) {
    return res.json({ success: true, data: [] });
  }

  const data = await searchChatUsers(req.user, query);
  res.json({ success: true, data });
});