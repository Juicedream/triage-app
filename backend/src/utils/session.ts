import type { Request, Response } from "express";
import { db } from "../db/index.js";
import bcrypt from "bcryptjs";
import { sessions, type NewSession } from "../db/schema.js";
import { eq, type Placeholder, type SQL } from "drizzle-orm";

type UserID = number | SQL<unknown> | Placeholder<string, any>;

export const Session = {
  update: async (
    res: Response,
    userId: UserID,
    oldRefreshToken: string,
    newRefreshToken: string,
  ) => {
    if (!userId || !oldRefreshToken || !newRefreshToken)
      throw new Error(
        "User Id or Old refresh token or new refresh token is required to update a session",
      );
    const existingSession = await Session.get(userId);
    if (!existingSession) {
      return res
        .status(401)
        .json({ message: "No active session for this user" });
    }
    const isRefreshTokenValid = await bcrypt.compare(
      oldRefreshToken,
      existingSession.tokenHash,
    );
    if (!isRefreshTokenValid) {
      return res.status(401).json({ message: "Old refresh token is invalid" });
    }
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const createdAt = new Date(Date.now()); // 7 days from now
    try {
      await db
        .update(sessions)
        .set({
          tokenHash: hashedRefreshToken,
          expiresAt,
          createdAt,
        })
        .where(eq(sessions.id, existingSession.id));
    } catch (error) {
      console.error("Error occurred while updating user session in db:", error);
      return res
        .status(500)
        .json({ message: "Unable to update user session, please try again." });
    }

    res.cookie("refreshToken", newRefreshToken);
  },
  get: async (userId: UserID) => {
    if (!userId) throw new Error("User Id is required to check a session");
    try {
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId));
      const existingSession = session[0];

      return existingSession;
    } catch (err) {
      // console.log("Unable to fetch current user session:", err);
      throw new Error(
        "Something went wrong in checking existing session, try again",
      );
    }
  },
  set: async (res: Response, userId: UserID, refreshToken: string) => {
    if (!userId || !refreshToken)
      throw new Error(
        "User Id and Refresh Token is required to create a session",
      );

    /** Checks for already existing session */
    try {
      const existingSession = await Session.get(userId);
      if (existingSession) {
        throw new Error("Session already exists for the user");
      }
    } catch (err) {
      return res.status(200).json({ message: "You are already logged in!" });
    }

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    try {
      await db.insert(sessions).values({
        userId,
        tokenHash,
        expiresAt,
      });
    } catch (error) {
      // console.error("Unable to insert a new session in the db:", error);
      throw new Error("Something went wrong in setting session, try again");
    }

    res.cookie("refreshToken", refreshToken);
  },

  remove: async (
    res: Response,
    userId: UserID,
    refreshToken: string,
    reason: "logout" | "revalidate",
  ) => {
    if (!userId || !refreshToken)
      throw new Error(
        "User Id and Refresh Token is required to remove a session",
      );
    let existingSession;
    /** Checks for already existing session */
    try {
      existingSession = await Session.get(userId);
      if (!existingSession) {
        throw new Error("User doesn't have a session");
      }
    } catch (err) {
      // console.log("Unable to fetch current user session:", err);
      throw new Error(
        "Something went wrong in checking existing session, try again",
      );
    }

    if (reason === "revalidate") {
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        existingSession.tokenHash,
      );
      if (!isRefreshTokenValid) {
        throw new Error("Refresh token is invalid");
      }
    }

    try {
      await db.delete(sessions).where(eq(sessions.userId, userId));
      await Promise.all([
        res.clearCookie("token"),
        res.clearCookie("refreshToken"),
      ]);
    } catch (e) {
      // console.error("Unable to delete session from db:", e);
      throw new Error("Something went wrong when removing session, try again");
    }
  },
  revoke: async (res: Response, session: NewSession) => {
    if (!session) {
      return res.status(401).json({ message: "No active session for user" });
    }
    try {
      await db
        .update(sessions)
        .set({ revokedAt: new Date(Date.now()) })
        .where(eq(sessions.id, Number(session?.id)));
    } catch (error) {
      console.error("Unable to revoke user session:", error);
      return res
        .status(500)
        .json({ message: "Session could not be revoked, please try again" });
    }

    return res
      .status(200)
      .json({ message: "Session has been revoked!", session });
  },
  unRevoke: async (res: Response, session: NewSession) => {
    if (!session) {
      return res.status(401).json({ message: "No active session for user" });
    }
    if (session.revokedAt === null) {
      return res.status(400).json({ message: "Session is already unrevoked!" });
    }

    try {
      await db
        .update(sessions)
        .set({ revokedAt: null })
        .where(eq(sessions.id, Number(session?.id)));
    } catch (error) {
      console.error("Unable to unrevoke user session:", error);
      return res
        .status(500)
        .json({ message: "Session could not be unrevoked, please try again" });
    }

    return res
      .status(200)
      .json({ message: "Session has been unrevoked!", session });
  },
};
