import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { ROLES } from "../utils/constants.js";
import { requestUpload } from "../utils/upload.js";
import * as workAssignmentController from "../controllers/workAssignment.controller.js";
import {
  createWorkAssignmentValidation,
  updateAssignmentStatusValidation,
  rejectAssignmentValidation
} from "../validations/workAssignment.validation.js";

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Create new work assignment (admin/sales only)
router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.SALES),
  requestUpload.array("attachments", 8),
  createWorkAssignmentValidation,
  validateRequest,
  workAssignmentController.createAssignment
);

// Get current user's assignments (worker)
router.get(
  "/me",
  authorize(ROLES.FIELD_WORK, ROLES.ELECTRICIAN, ROLES.VENDOR, ROLES.SERVICE_PROFESSIONAL),
  workAssignmentController.getMyAssignments
);

// Get assignments created by current user (admin/sales)
router.get(
  "/created",
  authorize(ROLES.ADMIN, ROLES.SALES),
  workAssignmentController.getMyCreatedAssignments
);

// Admin/Sales: List all assignments (with optional status, pagination)
router.get(
  "/all",
  authorize(ROLES.ADMIN, ROLES.SALES),
  workAssignmentController.getAllAssignments
);

// Get single assignment details
router.get(
  "/:id",
  workAssignmentController.getAssignmentById
);

// Worker: Accept assignment
router.patch(
  "/:id/accept",
  authorize(ROLES.FIELD_WORK, ROLES.ELECTRICIAN, ROLES.VENDOR, ROLES.SERVICE_PROFESSIONAL),
  workAssignmentController.acceptAssignment
);

// Worker: Reject assignment
router.patch(
  "/:id/reject",
  authorize(ROLES.FIELD_WORK, ROLES.ELECTRICIAN, ROLES.VENDOR, ROLES.SERVICE_PROFESSIONAL),
  rejectAssignmentValidation,
  validateRequest,
  workAssignmentController.rejectAssignment
);

// Worker: Complete assignment with proof
router.post(
  "/:id/proof",
  authorize(ROLES.FIELD_WORK, ROLES.ELECTRICIAN, ROLES.VENDOR, ROLES.SERVICE_PROFESSIONAL),
  requestUpload.array("proofs", 8),
  workAssignmentController.completeAssignmentWithProof
);

// Admin/Sales: Update assignment status
router.patch(
  "/:id/status",
  authorize(ROLES.ADMIN, ROLES.SALES),
  updateAssignmentStatusValidation,
  validateRequest,
  workAssignmentController.updateAssignmentStatus
);

export default router;
