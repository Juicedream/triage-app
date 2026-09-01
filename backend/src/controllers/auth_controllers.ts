import { type Request, type Response } from "express";
import jwt, { type JsonWebTokenError } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type {
  ILoginUserBodyDto,
  IRegisterUserDto,
  UserRole,
} from "../core/dtos/auth.dto.js";
import { eq } from "drizzle-orm";

import { TokenService } from "../services/jwt.service.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { SessionService } from "../services/session.service.js";

export class AuthController {
  private setCookie(res: Response, name: string, value: string) {
    res.cookie(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  public login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as ILoginUserBodyDto;

    try {
      const userExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!userExists) {
        res.status(404).json({ message: "Invalid credentials" });
        return;
      }

      const verifiedPassword = await bcrypt.compare(
        password,
        userExists.password,
      );

      if (!verifiedPassword) {
        res.status(404).json({ message: "Invalid credentials" });
        return;
      }

      if (!userExists.isEmailVerified) {
        res
          .status(200)
          .json({ message: "Kindly check your email for a verification link" });
        return;
      }

      const authTokens = TokenService.generateAuthTokens({
        id: userExists.id,
        role: userExists.role as UserRole,
      });

      const { error: sessionError } = await new SessionService(
        userExists.id,
      ).generateSesssionByUserId(authTokens);

      if (sessionError) {
        res.status(403).json({ message: sessionError });
        return;
      }

      this.setCookie(res, "refreshToken", authTokens.refreshToken);

      res.status(200).json({
        message: "Login successful!",
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
      });
    } catch (error) {
      console.error("Error occurred while logging in", error);
      res.status(500).json({
        message: "Unable to login user at the moment, please try again",
      });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    const { firstName, email, lastName, password }: IRegisterUserDto = req.body;

    try {
      const emailExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (emailExists) {
        res.status(409).json({
          message: `User with this email '${email}' already exists`,
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db
        .insert(users)
        .values({
          fullName: `${firstName} ${lastName}`,
          email,
          password: hashedPassword,
          avatarUrl: "",
        })
        .returning();

      const newUser = user[0];

      const emailToken = TokenService.generateToken("Email Validation", {
        id: newUser?.id,
        role: newUser?.role,
      });

      const verificationLink = `http://localhost:8080/api/v1/auth/email-validation?token=${emailToken}`;

      res.status(201).json({
        message: "Check your email for a verification link",
        link: verificationLink,
      });
    } catch (error) {
      console.error("Error: Unable to register user", error);
      res.status(500).json({
        message: "An error occurred while registering user, please try again.",
      });
    }
  };

  public validateEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.query;
    try {
      const emailToken = TokenService.verifyToken(
        "Email Validation",
        String(token),
      );

      if (!emailToken) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
      }

      const payload = emailToken as jwt.JwtPayload;

      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, payload?.id),
      });

      if (user?.isEmailVerified) {
        res.status(400).json({ message: "User is already validated" });
        return;
      }

      const update = await db
        .update(users)
        .set({ isEmailVerified: true })
        .where(eq(users.id, payload?.id))
        .returning();
      const updatedUser = update[0];

      const authTokens = TokenService.generateAuthTokens({
        id: updatedUser?.id,
        role: updatedUser?.role as UserRole,
      });

      const { error: sessionError } = await new SessionService(
        updatedUser?.id!,
      ).generateSesssionByUserId({
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
      });

      if (sessionError) {
        res.status(403).json({ message: sessionError });
        return;
      }

      res.status(200).json({
        message: "User validated successfully",
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
        user: updatedUser,
      });
    } catch (err) {
      console.log("An error occurred while trying to validate email:", err);
      if (err as typeof JsonWebTokenError) {
        res.status(403).json({ message: "Invalid or expired token!" });
        return;
      }
      res
        .status(403)
        .json({ message: "Unable to validate email, please try again" });
    }
  };

  public resendEmailToken = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { email } = req.body as { email: string };

    try {
      const userExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!userExists) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (!userExists.isEmailVerified) {
        const emailToken = TokenService.generateToken("Email Validation", {
          id: userExists.id,
          role: userExists.role,
        });

        const verificationLink = `http://localhost:8080/api/v1/auth/email-validation?token=${emailToken}`;

        res.status(200).json({
          message:
            "Resend Successful. Kindly check your email inbox for the new link",
          link: verificationLink,
        });
      } else {
        res.status(401).json({ message: "User is already verified" });
      }
    } catch (error) {
      console.error(
        "Error: An error occurred while trying to resend email verification token link",
        error,
      );
      res.status(500).json({
        message:
          "Error: Unable to email verification link at the moment, Kindly retry later",
      });
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    const userId = Number(req.user?.id);
    try {
      const { error: deleteError } = await new SessionService(
        userId,
      ).deleteSessionByUserId();
      if (deleteError) {
        res.status(403).json({ message: deleteError });
        return;
      }
      res.status(204).json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Unable to logout the user:", error);
      res.status(403).json({ message: "Unable to logout, please try again" });
    }
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id!;

    try {
      const user = await db.select().from(users).where(eq(users.id, userId));
      res.status(200).json({ user: user[0] });
    } catch (err) {
      console.error("Unable to fetch the current user:", err);
      res.status(500).json({
        message:
          "Error: Unable to fetch current user at the moment, kindly retry later",
      });
    }
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken;
    const userId = Number(req.user?.id);
    const userRole = req.user?.role as UserRole;

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }
    try {
      TokenService.verifyToken("Refresh Token", refreshToken);
      const tokens = TokenService.generateAuthTokens({
        id: userId,
        role: userRole,
      });

      const { error: updateError } = await new SessionService(
        userId,
      ).updateSessionByUserId(refreshToken, tokens.refreshToken);

      if (updateError) {
        res.status(403).json({ message: updateError });
        return;
      }

      this.setCookie(res, "refreshToken", tokens.refreshToken);

      res.status(200).json({
        accessToken: tokens.accessToken,
      });
    } catch (err) {
      console.error("Invalid or expired refresh token:", err);
      res.status(403).json({ message: "Invalid or expired refresh token" });
    }
  };
}
