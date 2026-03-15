import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { appRoutes } from "./routes/app.routes";
import { AppError } from "./app/utils/AppError";
import sendResponse from "./app/utils/response";
import { HTTP_STATUS } from "./app/utils/httpStatus";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", appRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: HTTP_STATUS.NOT_FOUND,
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    sendResponse(res, {
      statusCode: err.statusCode,
      success: false,
      message: err.message,
    });
  } else {
    console.error("❌ Unexpected Error:", err);
    sendResponse(res, {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Internal server error",
    });
  }
});

export default app;
