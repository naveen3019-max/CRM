import { asyncHandler } from "../utils/asyncHandler.js";
import { getUsers, updateUserRole as updateUserRoleService } from "../services/admin.service.js";

export const listUsers = asyncHandler(async (req, res) => {
  const users = await getUsers();
  res.json({ success: true, data: users });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const result = await updateUserRoleService(req.user.id, Number(req.params.id), req.body.role);
  res.json({ success: true, data: result });
});
