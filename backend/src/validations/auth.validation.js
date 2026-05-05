import { body } from "express-validator";
import { ROLES } from "../utils/constants.js";

export const signupValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
  body("email").trim().isEmail().normalizeEmail().withMessage("A valid email address is required"),
  body("mobile")
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Mobile number must be exactly 10 digits"),
  body("address")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Address must be at least 10 characters long"),
  body("password")
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .withMessage("Password must include one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must include one number"),
  body("role").optional().isIn(Object.values(ROLES)).withMessage("Invalid role selected")
];

export const loginValidation = [
  body("email").trim().isEmail().normalizeEmail(),
  body("password").isString().notEmpty()
];

export const updateProfileValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("phone").optional({ nullable: true }).trim().isLength({ min: 7, max: 30 }),
  body("currentPassword")
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage("Current password must be at least 8 characters"),
  body("newPassword")
    .optional()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("New password must include one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("New password must include one number"),
  body("newPassword").custom((value, { req }) => {
    if (!value) {
      return true;
    }

    if (!req.body.currentPassword) {
      throw new Error("Current password is required to set a new password");
    }

    return true;
  })
];
