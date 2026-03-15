import { Response } from "express";

type TMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: TMeta | null;
  data?: T | null;
};

const sendResponse = <T>(res: Response, data: TResponse<T>): void => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    meta: data.meta || null,
    data: data.data || null,
  });
};

export default sendResponse;
