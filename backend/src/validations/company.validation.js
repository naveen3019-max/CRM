import { body } from "express-validator";

export const registerValidation = [
  body("name").notEmpty().withMessage("Company name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

export const businessInfoValidation = [
  body("service_type").notEmpty().withMessage("Service type is required").isString().withMessage("Service type must be text"),
  body("description").optional({ checkFalsy: true }).isString(),
  body("years_of_experience").optional({ checkFalsy: true }).custom((value) => {
    if (value === '' || value === null) return true;
    return !isNaN(value) && parseInt(value) >= 0;
  }).withMessage("Years of experience must be a positive number"),
  body("address").notEmpty().withMessage("Address is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("pincode").custom((value) => {
    const clean = String(value).replace(/\s/g, '');
    return clean.length === 6 && /^\d+$/.test(clean);
  }).withMessage("Pincode must be 6 digits"),
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("alternate_phone").optional({ checkFalsy: true }),
  body("business_email").isEmail().withMessage("Valid business email is required"),
  body("website").optional({ checkFalsy: true }).isURL().withMessage("Invalid website URL"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];
