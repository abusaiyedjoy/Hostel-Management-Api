import { Request, Response, NextFunction } from "express";

type TAsyncController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

const handleController =
  (fn: TAsyncController) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default handleController;
