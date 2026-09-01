import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { type User } from "../db/schema.js";
import { TokenService } from "../services/jwt.service.js";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access token missing" });

  try {
    const decoded = TokenService.verifyToken("Auth Token", token);
    req.user = decoded as Partial<User>;
    next();
  } catch (error) {
    res.status(401).json({ message: "Access token expired or altered" });
  }
};
