import { body } from "express-validator";
import { ROLES } from "../utils/constants.js";

export const signupValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("email").trim().isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .withMessage("Password must include one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must include one number"),
  body("role").optional().isIn(Object.values(ROLES))
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
