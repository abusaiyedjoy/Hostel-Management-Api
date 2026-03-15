import { Router } from "express";
import { MealController } from "./mealManager.controller";
import { MealSchema } from "./mealManager.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router({ mergeParams: true });

// ─── Meal CRUD ────────────────────────────────────
router.post(
  "/",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  validateRequest(MealSchema.createMealSchema),
  MealController.createMeal,
);

router.get(
  "/",
  authorize("LOGGED_IN"),
  validateRequest(MealSchema.getMealsQuerySchema),
  MealController.getAllMeals,
);

router.get("/summary", authorize("LOGGED_IN"), MealController.getMealSummary);

router.get("/:id", authorize("LOGGED_IN"), MealController.getMealById);

router.patch(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  validateRequest(MealSchema.updateMealSchema),
  MealController.updateMeal,
);

router.delete(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  MealController.deleteMeal,
);

// ─── Meal Entries ─────────────────────────────────
router.post(
  "/:id/entries",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  validateRequest(MealSchema.createMealEntrySchema),
  MealController.createMealEntry,
);

router.post(
  "/:id/entries/bulk",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  validateRequest(MealSchema.bulkCreateMealEntrySchema),
  MealController.bulkCreateMealEntries,
);

router.get(
  "/:id/entries",
  authorize("LOGGED_IN"),
  MealController.getMealEntries,
);

router.patch(
  "/:mealId/entries/:id",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  validateRequest(MealSchema.updateMealEntrySchema),
  MealController.updateMealEntry,
);

router.delete(
  "/:mealId/entries/:id",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  MealController.deleteMealEntry,
);

export const MealRoutes = router;
