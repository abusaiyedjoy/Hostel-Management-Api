import { Request, Response, NextFunction } from "express";
import { JwtUtils, TJwtPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { HTTP_STATUS } from "../utils/httpStatus";
import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: TJwtPayload;
    }
  }
}

type TAuthGuard = "LOGGED_IN" | Role;

export const authorize = (...guards: TAuthGuard[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(
          "Unauthorized: No token provided",
          HTTP_STATUS.UNAUTHORIZED,
        );
      }

      const token = authHeader.split(" ")[1];
      const decoded = JwtUtils.verify(token);
      req.user = decoded;

      // LOGGED_IN means any authenticated user
      if (guards.includes("LOGGED_IN")) {
        return next();
      }

      // Check specific roles
      if (!guards.includes(decoded.role as Role)) {
        throw new AppError(
          `Forbidden: Only ${guards.join(", ")} can access this route`,
          HTTP_STATUS.FORBIDDEN,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
