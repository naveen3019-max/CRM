import { body } from "express-validator";

const URGENCY = ["normal", "important", "urgent"];
const STATUS = ["submitted", "in_review", "assigned", "in_progress", "completed", "cancelled"];

export const createServiceRequestValidation = [
  body("serviceCategory").trim().isLength({ min: 2, max: 80 }),
  body("otherCategory").optional({ nullable: true }).custom((value, { req }) => {
    if (req.body.serviceCategory === 'other') {
      if (!value || String(value).trim().length < 2) {
        throw new Error('otherCategory is required when serviceCategory is "other"');
      }
    }
    return true;
  }),
  body("problemDescription").trim().isLength({ min: 10, max: 5000 }),
  body("expectedSolution").trim().isLength({ min: 10, max: 5000 }),
  body("requirementDetails").trim().isLength({ min: 10, max: 8000 }),
  body("budget").optional({ nullable: true }).trim().isLength({ max: 120 }),
  body("urgency").isIn(URGENCY),
  body("address").trim().isLength({ min: 5, max: 1000 }),
  body("city").trim().isLength({ min: 2, max: 120 }),
  body("areaPincode").trim().isLength({ min: 3, max: 20 }),
  body("preferredDate").optional({ nullable: true }).isISO8601(),
  body("preferredTime").optional({ nullable: true }).trim().isLength({ max: 50 }),
  body("locationLat").optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body("locationLng").optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body("dynamicAnswers").optional({ nullable: true }).custom((value) => {
    if (typeof value === "string") {
      JSON.parse(value);
      return true;
    }

    if (typeof value === "object") {
      return true;
    }

    throw new Error("dynamicAnswers must be an object");
  })
];

export const updateServiceRequestValidation = [
  body("status").optional().isIn(STATUS),
  body("assignedWorkerId")
    .optional({ nullable: true })
    .isInt({ min: 1 }),
  body("cancelReason")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 5, max: 2000 })
];
