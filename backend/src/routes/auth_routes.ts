import express from "express";
import AuthController from "../controllers/auth_controllers.js";
import { AuthValidation } from "../services/validation.service.js";
import { validateRequest } from "../middlewares/validateRequest.middleware.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/ratelimiter.middleware.js";
const authRouter = express.Router();

authRouter
  .get(
    "/email-validation", // Verifies email via token query /email-validation?token=*******
    AuthValidation.emailValidation,
    validateRequest,
    AuthController.validateEmail,
  )
  .get("/me", AuthMiddleware.all, AuthController.me);

authRouter
  .post(
    "/login",
    AuthValidation.login,
    validateRequest,
    authLimiter,
    AuthController.login,
  )
  .post(
    "/register",
    AuthValidation.register,
    validateRequest,
    AuthController.register,
  )
  .post(
    "/resend-email-verification-link", // It requires an email in the body
    AuthValidation.resendEmailTokenLink,
    validateRequest,
    AuthController.resendEmailToken,
  )
  .post("/refresh", AuthMiddleware.all, AuthController.refresh)
  .post("/logout", AuthMiddleware.all, AuthController.logout);

export default authRouter;
