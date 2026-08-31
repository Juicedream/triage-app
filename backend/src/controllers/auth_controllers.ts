import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type {
  ILoginUserBodyDto,
  ILoginUserResponseDto,
  IRegisterUserDto,
  IRegisterUserResponseDto,
  IValidateEmailDto,
  IValidateEmailResponse,
} from "../core/dtos/auth.dto.js";
import { eq } from "drizzle-orm";

import { JwtService, type DataTypeProps } from "../services/jwt.service.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { Session } from "../utils/session.js";

const AuthController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body as ILoginUserBodyDto;

    try {
      const userExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!userExists) {
        return res.status(404).json({ message: "Invalid credentials" });
      }

      const verifiedPassword = await bcrypt.compare(
        password,
        userExists.password,
      );

      if (!verifiedPassword) {
        return res.status(404).json({ message: "Invalid credentials" });
      }

      if (!userExists.isEmailVerified) {
        return res
          .status(200)
          .json({ message: "Kindly check your email for a verification link" });
      }

      const token = JwtService.createJwtToken({
        id: userExists.id,
        role: userExists.role,
        reason: "Auth Token",
      });

      const refreshToken = JwtService.createJwtToken({
        id: userExists.id,
        role: userExists.role,
        reason: "Refresh Token",
      });

      await Session.set(res, userExists.id, refreshToken!);

      res.cookie("token", token);

      return res.status(200).json({
        message: "Login successful!",
        token,
        refreshToken,
      } as ILoginUserResponseDto);
    } catch (error) {
      console.error("Error occurred while logging in", error);
      return res.status(500).json({
        message:
          "Error: Unable to login user at the moment, Kindly retry later",
      });
    }
  },
  register: async (req: Request, res: Response) => {
    /**
     * 1. Get data from req.body
     * 2. check if email already exists in the db
     * 3. return already exists error if email exists
     * 4. hash password and proceed to create user,
     * 5. generate token for email validation
     * 6. return a message and email validation link then later actually send mail containing the link
     */
    const { firstName, email, lastName, password }: IRegisterUserDto = req.body;

    try {
      const emailExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (emailExists) {
        return res.status(409).json({
          message: "User with this email '" + email + "' already exists",
        });
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

      const token = JwtService.createJwtToken({
        id: newUser?.id,
        role: newUser?.role,
        reason: "Email Validation",
      });

      const verificationLink = `http://localhost:8080/api/v1/auth/email-validation?token=${token}`;

      return res.status(201).json({
        message: "Check your email for a verification link",
        link: verificationLink,
      });
    } catch (error) {
      console.error("Error: Unable to register user", error);
      res.status(500).json({
        message:
          "An error occurred while registering user, Kindly retry later.",
      });
    }
  },
  validateEmail: async (req: Request, res: Response) => {
    /**
     * 1. verify token
     * 2. extract the payload from the token
     * 3. find user by id from the db
     * 4. update the user isverified field from the db
     * 5. generate token
     * 6. return a response to the user with their information
     */
    const { token } = req.query;

    const { data, success } = JwtService.verifyJwtToken(String(token));

    if (!success) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, (data as jwt.JwtPayload)?.id),
    });

    if (user?.isEmailVerified) {
      return res.status(400).json({ message: "User is already validated" });
    }

    const update = await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq((data as jwt.JwtPayload)?.id, users.id))
      .returning();
    const updatedUser = update[0];

    const authToken = JwtService.createJwtToken({
      id: updatedUser?.id,
      role: updatedUser?.role,
      reason: "Auth Token",
    });
    const refreshToken = JwtService.createJwtToken({
      id: updatedUser?.id,
      role: updatedUser?.role,
      reason: "Refresh Token",
    });

    await Session.set(res, updatedUser?.id!, refreshToken!);
    res.cookie("token", authToken);

    return res.status(200).json({
      message: "User validated successfully",
      token: authToken,
      refreshToken,
      user: updatedUser,
    });
  },
  resendEmailToken: async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    /**
     * 1. verify email exists in db for a user
     * 2. check the isEmailVerified status
     * 3. if isEmailVerified is false, resend the email verification link with a message,
     * 4. if isEmailVerified is true, return a message saying email already verified
     */

    try {
      const userExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!userExists) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!userExists.isEmailVerified) {
        const token = JwtService.createJwtToken({
          id: userExists.id,
          role: userExists.role,
          reason: "Email Validation",
        });

        const verificationLink = `http://localhost:8080/api/v1/auth/email-validation?token=${token}`;

        return res.status(200).json({
          message:
            "Resend Successful. Kindly check your email inbox for the new link",
          link: verificationLink,
        });
      } else {
        return res.status(401).json({ message: "User is already verified" });
      }
    } catch (error) {
      console.error(
        "Error: An error occurred while trying to resend email verification token link",
        error,
      );
      return res.status(500).json({
        message:
          "Error: Unable to email verification link at the moment, Kindly retry later",
      });
    }
  },
  logout: async (req: Request, res: Response) => {
    await Session.remove(res, req.user?.id!, req?.refreshToken, "logout");
    return res.status(204).json({ message: "Logged out successfully" });
  },

  me: async (req: Request, res: Response) => {
    const userId = req.user?.id!;

    try {
      const user = await db.select().from(users).where(eq(users.id, userId));
      return res.status(200).json({ user: user[0] });
    } catch (err) {
      console.error("Unable to fetch the current user:", err);
      return res.status(500).json({
        message:
          "Error: Unable to fetch current user at the moment, kindly retry later",
      });
    }
  },
  refresh: async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const role = req.user?.role;
    const userRefreshToken = req.refreshToken;
    const existingSession = await Session.get(userId);
    if (!existingSession) {
      return res.status(400).json({
        message: "You dont have an active session, you need to be logged in.",
      });
    }

    const newToken = JwtService.createJwtToken({
      id: Number(userId),
      role,
      reason: "Auth Token",
    });
    const newRefreshToken = JwtService.createJwtToken({
      id: Number(userId),
      role,
      reason: "Refresh Token",
    });

    try {
      await Session.update(res, userId, userRefreshToken, newRefreshToken!);
    } catch (error) {
      console.log("Failed to save refesh token to backend for user.:", error);
      return res
        .status(500)
        .json({ message: "Unable to get a new refresh token, try again." });
    }
    res.cookie("token", newToken);

    return res
      .status(201)
      .json({ token: newToken, refreshToken: newRefreshToken });
  },
};

export default AuthController;
