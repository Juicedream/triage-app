import { body, query } from "express-validator";

const AuthValidation = {
  login: [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),

    body("password").isLength({ min: 4 }).withMessage("Password is required"),
  ],
  register: [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password should be at least 6 characters"),

    body("firstName")
      .isString()
      .withMessage("First Name must be a string")
      .isLength({ min: 3 })
      .withMessage("First Name must be at least 3 characters")
      .trim(),

    body("lastName")
      .isString()
      .withMessage("Last Name must be a string")
      .isLength({ min: 3 })
      .withMessage("Last Name must be at least 3 characters")
      .trim(),
  ],
  emailValidation: [
    query("token").isString().withMessage("Token is required").trim(),
  ],
  resendEmailTokenLink: [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
  ],
};

export { AuthValidation };
