import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { MealService } from "./mealManager.service";

// POST /api/mess/:messId/meals
const createMeal = handleController(async (req: Request, res: Response) => {
  const meal = await MealService.createMeal(
    req.params.messId as string,
    req.body,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.CREATED,
    success: true,
    message: "Meal created successfully",
    data: meal,
  });
});

// GET /api/mess/:messId/meals
const getAllMeals = handleController(async (req: Request, res: Response) => {
  const result = await MealService.getAllMeals(
    req.params.messId as string,
    req.query as any,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Meals fetched successfully",
    meta: result.meta,
    data: result.meals,
  });
});

// GET /api/mess/:messId/meals/summary
const getMealSummary = handleController(async (req: Request, res: Response) => {
  const summary = await MealService.getMealSummary(
    req.params.messId as string,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Meal summary fetched successfully",
    data: summary,
  });
});

// GET /api/mess/:messId/meals/:id
const getMealById = handleController(async (req: Request, res: Response) => {
  const meal = await MealService.getMealById(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Meal fetched successfully",
    data: meal,
  });
});

// PATCH /api/mess/:messId/meals/:id
const updateMeal = handleController(async (req: Request, res: Response) => {
  const meal = await MealService.updateMeal(
    req.params.id as string,
    req.body,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Meal updated successfully",
    data: meal,
  });
});

// DELETE /api/mess/:messId/meals/:id
const deleteMeal = handleController(async (req: Request, res: Response) => {
  const result = await MealService.deleteMeal(
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
});

// POST /api/mess/:messId/meals/:id/entries
const createMealEntry = handleController(
  async (req: Request, res: Response) => {
    const entry = await MealService.createMealEntry(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      success: true,
      message: "Meal entry created successfully",
      data: entry,
    });
  },
);

// POST /api/mess/:messId/meals/:id/entries/bulk
const bulkCreateMealEntries = handleController(
  async (req: Request, res: Response) => {
    const result = await MealService.bulkCreateMealEntries(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      success: true,
      message: result.message,
      data: result,
    });
  },
);

// GET /api/mess/:messId/meals/:id/entries
const getMealEntries = handleController(async (req: Request, res: Response) => {
  const entries = await MealService.getMealEntries(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Meal entries fetched successfully",
    data: entries,
  });
});

// PATCH /api/mess/:messId/meals/:mealId/entries/:id
const updateMealEntry = handleController(
  async (req: Request, res: Response) => {
    const entry = await MealService.updateMealEntry(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Meal entry updated successfully",
      data: entry,
    });
  },
);

// DELETE /api/mess/:messId/meals/:mealId/entries/:id
const deleteMealEntry = handleController(
  async (req: Request, res: Response) => {
    const result = await MealService.deleteMealEntry(
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

export const MealController = {
  createMeal,
  getAllMeals,
  getMealSummary,
  getMealById,
  updateMeal,
  deleteMeal,
  createMealEntry,
  bulkCreateMealEntries,
  getMealEntries,
  updateMealEntry,
  deleteMealEntry,
};
