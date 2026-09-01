import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { JwtPayload } from "../core/dtos/auth.dto.js";

dotenv.config();

const ACCESS_TOKEN_JWT_SECRET = process.env.ACCESS_TOKEN_JWT_SECRET!;
const REFRESH_TOKEN_JWT_SECRET = process.env.REFRESH_TOKEN_JWT_SECRET!;
const EMAIL_VALIDATION_TOKEN_JWT_SECRET =
  process.env.EMAIL_VALIDATION_TOKEN_JWT_SECRET!;

type ReasonProps = "Auth Token" | "Refresh Token" | "Email Validation";

export type DataTypeProps = {
  id: string | undefined;
  role: string | undefined;
};

export class TokenService {
  static generateToken(
    reason: ReasonProps,
    payload: Partial<JwtPayload>,
  ): string {
    const token = jwt.sign(
      payload,
      reason === "Auth Token"
        ? ACCESS_TOKEN_JWT_SECRET
        : reason === "Refresh Token"
          ? REFRESH_TOKEN_JWT_SECRET
          : EMAIL_VALIDATION_TOKEN_JWT_SECRET,
      {
        expiresIn:
          reason === "Auth Token"
            ? "15m"
            : reason === "Refresh Token"
              ? "7d"
              : "30m",
      },
    );
    return token;
  }

  static generateAuthTokens(payload: JwtPayload) {
    const accessToken = this.generateToken("Auth Token", payload);
    const refreshToken = this.generateToken("Refresh Token", {
      id: payload.id,
    });
    return {
      accessToken,
      refreshToken,
    };
  }

  static verifyToken(
    reason: ReasonProps,
    token: string,
  ): JwtPayload | { id: string } | null | undefined {
    return jwt.verify(
      token,
      reason === "Auth Token"
        ? ACCESS_TOKEN_JWT_SECRET
        : reason === "Refresh Token"
          ? REFRESH_TOKEN_JWT_SECRET
          : EMAIL_VALIDATION_TOKEN_JWT_SECRET,
    ) as JwtPayload | { id: string } | null | undefined;
  }
}
