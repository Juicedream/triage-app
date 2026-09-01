import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../core/dtos/auth.dto.js";

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role!)) {
      res.status(403).json({
        message: "Forbidden: Insufficient permissions",
      });
      return;
    }

    next();
  };
};
