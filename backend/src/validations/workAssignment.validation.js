import { body } from "express-validator";

export const createWorkAssignmentValidation = [
  body("workerId")
    .isInt({ gt: 0 })
    .withMessage("Worker ID must be a valid positive number"),
  body("serviceTitle")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Service title must be between 2 and 255 characters"),
  body("serviceCategory")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Service category must not exceed 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Location must not exceed 500 characters"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must not exceed 100 characters"),
  body("areaPincode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Area/Pincode must not exceed 20 characters"),
  body("budget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),
  body("priority")
    .optional()
    .isIn(["normal", "important", "urgent"])
    .withMessage("Priority must be normal, important, or urgent"),
  body("preferredDate")
    .optional()
    .isISO8601()
    .withMessage("Preferred date must be a valid date"),
  body("preferredTime")
    .optional()
    .trim()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Preferred time must be in HH:MM format"),
  body("additionalInstructions")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Additional instructions must not exceed 2000 characters")
];

export const updateAssignmentStatusValidation = [
  body("status")
    .isIn(["pending", "accepted", "in_progress", "completed", "rejected"])
    .withMessage("Status must be one of: pending, accepted, in_progress, completed, or rejected")
];

export const rejectAssignmentValidation = [
  body("rejectionReason")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Rejection reason must not exceed 1000 characters")
];
