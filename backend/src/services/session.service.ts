import { db } from "../db/index.js";
import bcrypt from "bcryptjs";
import { sessions, type Session } from "../db/schema.js";
import { eq, type Placeholder, type SQL } from "drizzle-orm";

type UserID = number | SQL<unknown> | Placeholder<string, any>;
interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export class SessionService {
  private userId: UserID;
  private expiresAt: Date;
  private createdAt: Date;
  private revokedAt: Date | null;

  constructor(id: UserID) {
    this.userId = id;
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.createdAt = new Date(Date.now()); // current date and time
    this.revokedAt = new Date(Date.now()); // current date and time
  }

  private async hashToken(token: string) {
    return await bcrypt.hash(token, 10);
  }

  public async getCurrentSessionByUserId(): Promise<
    Session | null | undefined
  > {
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, this.userId));
    return session[0] as Session;
  }

  public async generateSesssionByUserId(
    tokenPayload: TokenPayload,
  ): Promise<{ error: string | null }> {
    const existingSession = await this.getCurrentSessionByUserId();
    const tokenHash = await this.hashToken(tokenPayload.refreshToken);

    try {
      if (existingSession) {
        await db
          .update(sessions)
          .set({
            tokenHash,
            createdAt: this.createdAt,
            expiresAt: this.expiresAt,
          })
          .where(eq(sessions.id, existingSession.id));

        return { error: null };
      }

      // Create session and save to the db
      await db.insert(sessions).values({
        userId: this.userId,
        createdAt: this.createdAt,
        expiresAt: this.expiresAt,
        tokenHash,
      });
      return { error: null };
    } catch (error) {
      console.error("Unable to generate and save session to the db:", error);
      return {
        error: "Unable to generate session, please try again!",
      };
    }
  }

  public async deleteSessionByUserId(): Promise<{
    error: string | null;
  }> {
    const existingSession = await this.getCurrentSessionByUserId();
    if (!existingSession) return { error: "No session to delete!" };

    try {
      await db.delete(sessions).where(eq(sessions.id, existingSession.id));
      return { error: null };
    } catch (error) {
      console.error("Unable to delete session from the db:", error);
      return {
        error: "Unable to delete session, please try again!",
      };
    }
  }

  public async updateSessionByUserId(
    oldRefreshToken: string,
    newRefreshToken: string,
  ): Promise<{
    error: string | null;
  }> {
    const existingSession = await this.getCurrentSessionByUserId();
    if (!existingSession) return { error: "No session to update!" };

    // Compare the old refresh token
    const areMatchingTokens = await bcrypt.compare(
      oldRefreshToken,
      existingSession.tokenHash,
    );

    if (!areMatchingTokens) {
      return { error: "Invalid old refresh token" };
    }

    const tokenHash = await this.hashToken(newRefreshToken);

    try {
      await db
        .update(sessions)
        .set({
          tokenHash,
          createdAt: this.createdAt,
          expiresAt: this.expiresAt,
        })
        .where(eq(sessions.id, existingSession.id));
      return { error: null };
    } catch (error) {
      console.error("Unable to delete session from the db:", error);
      return {
        error: "Unable to delete session, please try again!",
      };
    }
  }

  public async revokeSessionByUserId(): Promise<{
    error: string | null;
  }> {
    const existingSession = await this.getCurrentSessionByUserId();
    if (!existingSession) return { error: "No session to update!" };

    try {
      await db
        .update(sessions)
        .set({
          revokedAt: this.revokedAt,
        })
        .where(eq(sessions.id, existingSession.id));
      return { error: null };
    } catch (error) {
      console.error("Unable to revoke session on the db:", error);
      return {
        error: "Unable to revoke session, please try again!",
      };
    }
  }

  public async unRevokeSessionByUserId(): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const existingSession = await this.getCurrentSessionByUserId();
    if (!existingSession)
      return { success: false, error: "No session to update!" };

    try {
      await db
        .update(sessions)
        .set({
          revokedAt: null,
        })
        .where(eq(sessions.id, existingSession.id));
      return { success: true, error: null };
    } catch (error) {
      console.error("Unable to revoke session on the db:", error);
      return {
        success: false,
        error: "Unable to revoke session, please try again!",
      };
    }
  }
}
