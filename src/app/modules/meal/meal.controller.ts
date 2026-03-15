import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { MealManagerService } from "./meal.service";

// POST /api/mess/:messId/meal-managers
const assignMealManager = handleController(
  async (req: Request, res: Response) => {
    const mealManager = await MealManagerService.assignMealManager(
      req.params.messId as string,
      req.body,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      success: true,
      message: "Meal manager assigned successfully",
      data: mealManager,
    });
  },
);

// GET /api/mess/:messId/meal-managers
const getAllMealManagers = handleController(
  async (req: Request, res: Response) => {
    const result = await MealManagerService.getAllMealManagers(
      req.params.messId as string,
      req.query as any,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Meal managers fetched successfully",
      meta: result.meta,
      data: result.mealManagers,
    });
  },
);

// GET /api/meal-managers/my-profile
const getMyMealManagerProfile = handleController(
  async (req: Request, res: Response) => {
    const mealManager = await MealManagerService.getMyMealManagerProfile(
      req.user!.id,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Your meal manager profile fetched successfully",
      data: mealManager,
    });
  },
);

// GET /api/mess/:messId/meal-managers/:id
const getMealManagerById = handleController(
  async (req: Request, res: Response) => {
    const mealManager = await MealManagerService.getMealManagerById(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Meal manager fetched successfully",
      data: mealManager,
    });
  },
);

// GET /api/meal-managers/:id/stats
const getMealManagerStats = handleController(
  async (req: Request, res: Response) => {
    const stats = await MealManagerService.getMealManagerStats(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Meal manager stats fetched successfully",
      data: stats,
    });
  },
);

// PATCH /api/mess/:messId/meal-managers/:id/status
const updateMealManagerStatus = handleController(
  async (req: Request, res: Response) => {
    const mealManager = await MealManagerService.updateMealManagerStatus(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: `Meal manager ${req.body.isActive ? "activated" : "deactivated"} successfully`,
      data: mealManager,
    });
  },
);

// DELETE /api/mess/:messId/meal-managers/:id
const removeMealManager = handleController(
  async (req: Request, res: Response) => {
    const result = await MealManagerService.removeMealManager(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: result.message,
      data: null,
    });
  },
);

export const MealManagerController = {
  assignMealManager,
  getAllMealManagers,
  getMyMealManagerProfile,
  getMealManagerById,
  getMealManagerStats,
  updateMealManagerStatus,
  removeMealManager,
};
