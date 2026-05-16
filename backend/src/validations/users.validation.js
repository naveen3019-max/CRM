import { body } from "express-validator";
import { ROLES } from "../utils/constants.js";

export const completeProfileValidation = [
  body("state").trim().notEmpty().withMessage("State is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("pincode")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
  body("about")
    .trim()
    .custom((value, { req }) => {
      if (req.user?.role === ROLES.CUSTOMER) {
        return true;
      }

      return String(value || "").trim().length >= 20;
    })
    .withMessage("About me must be at least 20 characters"),
  body("experience")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === "" || value === null || value === undefined) {
        return true;
      }

      return !Number.isNaN(Number(value));
    })
    .withMessage("Experience must be numeric"),
  body("skills")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Skills must be text"),
  body("workType")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Work type must be text")
];
