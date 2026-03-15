import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./AppError";
import { HTTP_STATUS } from "./httpStatus";

export type TJwtPayload = {
  id: string;
  email: string;
  role: string;
};

const generate = (payload: TJwtPayload, expiresIn?: string): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn || env.JWT_EXPIRES_IN,
  } as SignOptions);
};

const verify = (token: string): TJwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    throw new AppError("Invalid or expired token", HTTP_STATUS.UNAUTHORIZED);
  }
};

const decode = (token: string): TJwtPayload => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded) {
      throw new AppError("Invalid token", HTTP_STATUS.UNAUTHORIZED);
    }
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    throw new AppError("Invalid token", HTTP_STATUS.UNAUTHORIZED);
  }
};

export const JwtUtils = { generate, verify, decode };
