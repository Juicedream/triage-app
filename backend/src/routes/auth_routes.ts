import express, { request, response, type Request } from "express";

import { AuthValidation } from "../services/validation.service.js";
import { validateRequest } from "../middlewares/validateRequest.middleware.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/ratelimiter.middleware.js";
import { AuthController } from "../controllers/auth_controllers.js";
const authRouter = express.Router();

const authController = new AuthController();

authRouter
  .get(
    "/email-validation", // Verifies email via token query /email-validation?token=*******
    AuthValidation.emailValidation,
    validateRequest,
    authController.validateEmail,
  )
  .get("/me", authenticateToken, authController.me);

authRouter
  .post(
    "/login",
    AuthValidation.login,
    validateRequest,
    authLimiter,
    authController.login,
  )
  .post(
    "/register",
    AuthValidation.register,
    validateRequest,
    authController.register,
  )
  .post(
    "/resend-email-verification-link", // It requires an email in the body
    AuthValidation.resendEmailTokenLink,
    validateRequest,
    authController.resendEmailToken,
  )
  .post("/refresh", authenticateToken, authController.refresh)
  .post("/logout", authenticateToken, authController.logout);

export default authRouter;
