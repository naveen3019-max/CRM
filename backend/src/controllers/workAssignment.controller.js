import * as workAssignmentService from "../services/workAssignment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Admin/Sales: Create work assignment
export const createAssignment = asyncHandler(async (req, res) => {
  const { workerId, customerId, customerName, serviceTitle, serviceCategory, description, location, city, areaPincode, budget, priority, preferredDate, preferredTime, additionalInstructions } = req.body;

  const assignment = await workAssignmentService.createWorkAssignment(
    {
      workerId,
      customerId,
      customerName,
      serviceTitle,
      serviceCategory,
      description,
      location,
      city,
      areaPincode,
      budget,
      priority,
      preferredDate,
      preferredTime,
      additionalInstructions,
      attachments: req.files || []
    },
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: "Work assignment created successfully",
    data: assignment
  });
});

// Worker: Get own assignments
export const getMyAssignments = asyncHandler(async (req, res) => {
  const { status } = req.query;

  // Debug: log requester and query for troubleshooting assignment visibility
  try {
    console.debug(`[workAssignments] getMyAssignments called by user=${req.user?.id} role=${req.user?.role} status=${status || 'all'}`);
  } catch (e) {
    // ignore
  }

  const assignments = await workAssignmentService.listAssignmentsForWorker(
    req.user.id,
    status || null
  );

  try {
    console.debug(`[workAssignments] returning ${Array.isArray(assignments) ? assignments.length : 0} assignments for user=${req.user?.id}`);
  } catch (e) {
    // ignore
  }

  res.status(200).json({
    success: true,
    data: assignments,
    total: assignments.length
  });
});

// Admin/Sales: Get assignments they created
export const getMyCreatedAssignments = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const assignments = await workAssignmentService.listAssignmentsCreatedByAdmin(
    req.user.id,
    status || null
  );

  res.status(200).json({
    success: true,
    data: assignments,
    total: assignments.length
  });
});

// Get single assignment details
export const getAssignmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await workAssignmentService.getWorkAssignmentById(id);

  // Verify access
  if (
    req.user.id !== assignment.workerId &&
    req.user.id !== assignment.assignedById &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this assignment"
    });
  }

  res.status(200).json({
    success: true,
    data: assignment
  });
});

// Worker: Accept assignment
export const acceptAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await workAssignmentService.acceptWorkAssignment(id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Assignment accepted successfully",
    data: assignment
  });
});

// Worker: Reject assignment
export const rejectAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const assignment = await workAssignmentService.rejectWorkAssignment(
    id,
    req.user.id,
    rejectionReason || null
  );

  res.status(200).json({
    success: true,
    message: "Assignment rejected successfully",
    data: assignment
  });
});

// Worker: Complete assignment with proof
export const completeAssignmentWithProof = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Debug: log incoming proof upload details to help diagnose 400 errors
  try {
    const preview = await workAssignmentService.getWorkAssignmentById(id).catch(() => null);
    try {
      console.debug(`[workAssignments.proof] user=${req.user?.id} assignment=${id} status=${preview?.status || 'unknown'} files=${(req.files||[]).length}`);
    } catch (e) {
      // ignore logging errors
    }
  } catch (e) {
    // ignore
  }

  const assignment = await workAssignmentService.completeWorkAssignmentWithProof(
    id,
    req.user.id,
    req.files || [],
    req.body.note || null
  );

  res.status(200).json({
    success: true,
    message: "Assignment completed with proof successfully",
    data: assignment
  });
});

// Admin/Sales: Update assignment status
export const updateAssignmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status field is required"
    });
  }

  const assignment = await workAssignmentService.updateAssignmentStatus(
    id,
    status,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: "Assignment status updated successfully",
    data: assignment
  });
});

// Admin/Sales: List all assignments (with optional status filter and pagination)
export const getAllAssignments = asyncHandler(async (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;

  // Basic RBAC: only allow admin or sales roles
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "sales")) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const assignments = await workAssignmentService.listAllWorkAssignments(
    status || null,
    Number(limit) || 100,
    Number(offset) || 0
  );

  res.status(200).json({ success: true, data: assignments, total: Array.isArray(assignments) ? assignments.length : 0 });
});
