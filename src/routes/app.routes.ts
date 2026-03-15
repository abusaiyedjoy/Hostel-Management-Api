import { Router } from "express";
import { AuthRoutes } from "../app/modules/auth/auth.route";
import { UserRoutes } from "../app/modules/user/user.route";
import { MessRoutes } from "../app/modules/mess/mess.route";
import {
  MemberMessRoutes,
  MemberRoutes,
} from "../app/modules/member/member.route";
import {
  MealManagerMessRoutes,
  MealManagerRoutes,
} from "../app/modules/meal/meal.route";
import { MealRoutes } from "../app/modules/mealManager/mealManager.route";

const router = Router();

//  Health Check
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is healthy ✅",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

//  Auth & Users
router.use("/auth", AuthRoutes);
router.use("/admin/users", UserRoutes);

//  Mess
router.use("/mess", MessRoutes);

//  Members
router.use("/mess/:messId/members", MemberMessRoutes);
router.use("/members", MemberRoutes);

//  Meal Managers
router.use("/mess/:messId/meal-managers", MealManagerMessRoutes);
router.use("/meal-managers", MealManagerRoutes);

//  Meals
router.use("/mess/:messId/meals", MealRoutes);

export const appRoutes = router;
