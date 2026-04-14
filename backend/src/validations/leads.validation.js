import { body } from "express-validator";
import { LEAD_STATUS } from "../utils/constants.js";

export const createLeadValidation = [
  body("customerId").isInt({ min: 1 }),
  body("source").trim().isLength({ min: 2, max: 50 }),
  body("title").trim().isLength({ min: 2, max: 120 }),
  body("status").optional().isIn(Object.values(LEAD_STATUS))
];

export const updateLeadValidation = [
  body("status").optional().isIn(Object.values(LEAD_STATUS)),
  body("source").optional().trim().isLength({ min: 2, max: 50 }),
  body("title").optional().trim().isLength({ min: 2, max: 120 }),
  body("budget").optional().isFloat({ min: 0 })
];

export const leadNoteValidation = [
  body("note").trim().isLength({ min: 2, max: 2000 }),
  body("followUpAt").optional().isISO8601()
];
