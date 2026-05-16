import { asyncHandler } from "../utils/asyncHandler.js";
import { searchChatUsers } from "../services/users.service.js";

export const searchUsers = asyncHandler(async (req, res) => {
  const { query = "", city = "", pincode = "", experience = "", service_category = "" } = req.query;
  const queryTrim = String(query).trim();
  
  if (!queryTrim) {
    return res.json({ success: true, data: [] });
  }

  const filters = {
    city: String(city).trim(),
    pincode: String(pincode).trim(),
    experience: String(experience).trim(),
    service_category: String(service_category).trim()
  };

  const data = await searchChatUsers(req.user, queryTrim, filters);
  res.json({ success: true, data });
});