import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

export type TokenProps = {
  id: string | number | undefined;
  role: string | undefined;
  reason: "Auth Token" | "Refresh Token" | "Email Validation";
};

export type DataTypeProps = {
  id: string | undefined;
  role: string | undefined;
};

export const JwtService = {
  createJwtToken: ({ id, role, reason }: TokenProps): string | undefined => {
    if (reason === "Refresh Token") {
      const token = jwt.sign(
        {
          id,
          role,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      return token;
    }

    if (reason === "Auth Token") {
      const token = jwt.sign(
        {
          id,
          role,
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );
      return token;
    }

    if (reason === "Email Validation") {
      const token = jwt.sign(
        {
          id,
          role,
        },
        JWT_SECRET,
        { expiresIn: "10m" },
      );
      return token;
    }
  },

  decodeJwtToken: (token: string) => {
    if (!token) throw new Error("No token provided for decoding");
    const decoded = jwt.decode(token);
    return decoded;
  },

  verifyJwtToken: (
    token: string | null | undefined,
  ): {
    data: string | jwt.JwtPayload | null;
    success: boolean;
  } => {
    if (!token) throw new Error("No token provided for verification");
    try {
      const data = jwt.verify(token, JWT_SECRET);
      return { data, success: true };
    } catch (error) {
      return { data: null, success: false };
    }
  },
};
