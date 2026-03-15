import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { appRoutes } from "./routes/app.routes";
import { AppError } from "./app/utils/AppError";
import sendResponse from "./app/utils/response";
import { HTTP_STATUS } from "./app/utils/httpStatus";

const app = express();

//  Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  API Routes
app.use("/api", appRoutes);

//  Root
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "🏨 Hostel Management API",
    version: "1.0.0",
    docs: "/api/health",
    endpoints: {
      auth: "/api/auth",
      admin: "/api/admin/users",
      mess: "/api/mess",
      members: "/api/members",
      mealManagers: "/api/meal-managers",
      meals: "/api/mess/:messId/meals",
    },
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: HTTP_STATUS.NOT_FOUND,
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Error:", err);

  if (err instanceof AppError) {
    sendResponse(res, {
      statusCode: err.statusCode,
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma known errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    if (prismaError.code === "P2002") {
      sendResponse(res, {
        statusCode: HTTP_STATUS.CONFLICT,
        success: false,
        message: `Duplicate value for field: ${prismaError.meta?.target}`,
      });
      return;
    }

    if (prismaError.code === "P2025") {
      sendResponse(res, {
        statusCode: HTTP_STATUS.NOT_FOUND,
        success: false,
        message: "Record not found",
      });
      return;
    }
  }

  sendResponse(res, {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    success: false,
    message: "Internal server error",
  });
});

export default app;
