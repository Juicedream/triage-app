import type { Request, Response, NextFunction } from "express";
import { Session } from "../utils/session.js";
import { JwtService, type TokenProps } from "../services/jwt.service.js";
import type { Placeholder, SQL } from "drizzle-orm";
type UserRole = "admin" | "agent" | "customer";
// Augment the core Express request interface
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id?: number | SQL<unknown> | Placeholder<string, any>;
      role?: UserRole;
      email?: string;
    };
    refreshToken: string;
  }
}

export const AuthMiddleware = {
  all: async (req: Request, res: Response, next: NextFunction) => {
    const authToken =
      req.cookies?.token || req.headers.authorization?.startsWith("Bearer ");
    const refreshToken =
      req.cookies?.refreshToken ||
      req.headers.authorization?.startsWith("Bearer ");

    const requiredTokens = authToken && refreshToken;

    if (!requiredTokens) {
      return res
        .status(401)
        .json({ message: "You need to be logged in first!" });
    }

    const token = JwtService.verifyJwtToken(authToken);

    const data = token.data as TokenProps;

    if (!data) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Verify session via refreshToken

    const session = await Session.get(Number(data.id)!);
    if (!session) {
      return res.status(401).json({
        message: "You don't have an active session, kindly login!",
      });
    }

    // Check if session is revoked or not
    if (session.revokedAt) {
      return res.status(401).json({
        message: "Your account has been suspended",
      });
    }

    req.user = { id: Number(data.id)!, role: String(data.role) as UserRole };
    req.refreshToken = refreshToken;
    next();
  },
};
