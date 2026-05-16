import { body } from "express-validator";
import { LANGUAGE_CODES, ROLES } from "../utils/constants.js";

export const signupValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
  body("email").trim().isEmail().normalizeEmail().withMessage("A valid email address is required"),
  body("mobile")
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Mobile number must be exactly 10 digits"),
  body("password")
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .withMessage("Password must include one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must include one number"),
  body("workType").optional({ nullable: true }).trim().isLength({ min: 2, max: 255 }).withMessage("Work type must be between 2 and 255 characters"),
  body("role").optional().isIn(Object.values(ROLES)).withMessage("Invalid role selected"),
  body("preferredLanguage").optional().isIn(LANGUAGE_CODES).withMessage("Invalid preferred language")
];

export const loginValidation = [
  body("email").trim().isEmail().normalizeEmail(),
  body("password").isString().notEmpty()
];

export const updateProfileValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("phone").optional({ nullable: true }).trim().isLength({ min: 7, max: 30 }),
  body("mobile").optional({ nullable: true }).trim().matches(/^\d{10}$/).withMessage("Mobile must be 10 digits"),
  body("state").optional({ nullable: true }).trim().isLength({ min: 2, max: 100 }),
  body("city").optional({ nullable: true }).trim().isLength({ min: 2, max: 100 }),
  body("pincode").optional({ nullable: true }).trim().isLength({ min: 5, max: 10 }),
  body("experience").optional({ nullable: true }).isInt({ min: 0, max: 100 }).withMessage("Experience must be a number between 0 and 100"),
  body("about").optional({ nullable: true }).trim().isLength({ min: 20 }).withMessage("About section must be at least 20 characters"),
  body("skills").optional({ nullable: true }).trim(),
  body("workType").optional({ nullable: true }).trim(),
  body("preferredLanguage").optional().isIn(LANGUAGE_CODES).withMessage("Invalid preferred language"),
  body("profileCompleted").optional().isBoolean().withMessage("profileCompleted must be boolean"),
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
