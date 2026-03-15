import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { HTTP_STATUS } from "../utils/httpStatus";

const validateRequest =
  (schema: ZodObject) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.message;
        next(new AppError(message, HTTP_STATUS.BAD_REQUEST));
      } else {
        next(error);
      }
    }
  };

export default validateRequest;
