import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Unauthorized: Please login first", 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        `Forbidden: Only ${roles.join(", ")} can access this route`,
        403,
      );
      return;
    }

    next();
  };
};
