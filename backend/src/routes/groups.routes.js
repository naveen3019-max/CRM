import { Router } from "express";
import * as controller from "../controllers/group.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Group CRUD
router.post("/create", controller.createGroup);
router.post("/", controller.createGroup);
router.get("/", controller.listUserGroups);
router.get("/by-scope", controller.listGroupsByScope);
router.get("/:id", controller.getGroupDetails);
router.put("/:id", controller.updateGroup);
router.delete("/:id", controller.deleteGroup);

// Group members
router.get("/:id/members", controller.listMembers);
router.post("/:id/members", controller.addMember);
router.delete("/:id/members/:userId", controller.removeMember);

// Group messaging
router.post("/:id/messages", controller.sendMessage);
router.get("/:id/messages", controller.getMessages);
router.get("/:id/pinned", controller.getPinnedMessages);
router.post("/:id/messages/read", controller.markMessagesRead);

// Unread counts
router.get("/:id/unread", controller.getUnreadCount);
router.get("/unread/total", controller.getTotalUnread);
router.get("/unread/groups", controller.getUnreadGroups);

export default router;
