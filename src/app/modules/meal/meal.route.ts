import { Router } from "express";
import { MealManagerController } from "./meal.controller";
import { MealManagerSchema } from "./meal.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

// ─── Nested Router: /api/mess/:messId/meal-managers
const messRouter = Router({ mergeParams: true });

messRouter.post(
  "/",
  authorize("ADMIN", "MESS_MANAGER"),
  validateRequest(MealManagerSchema.assignMealManagerSchema),
  MealManagerController.assignMealManager,
);

messRouter.get(
  "/",
  authorize("ADMIN", "MESS_MANAGER"),
  validateRequest(MealManagerSchema.getMealManagersQuerySchema),
  MealManagerController.getAllMealManagers,
);

messRouter.get(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  MealManagerController.getMealManagerById,
);

messRouter.patch(
  "/:id/status",
  authorize("ADMIN", "MESS_MANAGER"),
  validateRequest(MealManagerSchema.updateMealManagerStatusSchema),
  MealManagerController.updateMealManagerStatus,
);

messRouter.delete(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER"),
  MealManagerController.removeMealManager,
);

// ─── Standalone Router: /api/meal-managers
const mealManagerRouter = Router();

mealManagerRouter.get(
  "/my-profile",
  authorize("MEAL_MANAGER"),
  MealManagerController.getMyMealManagerProfile,
);

mealManagerRouter.get(
  "/:id/stats",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  MealManagerController.getMealManagerStats,
);

export const MealManagerMessRoutes = messRouter;
export const MealManagerRoutes = mealManagerRouter;
