import { Router } from "express";
import { UserController } from "./user.controller";
import { UserSchema } from "./user.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// All routes are admin only
router.use(authorize("ADMIN"));

// Dashboard
router.get("/stats", UserController.getDashboardStats);

// User Management
router.get(
  "/",
  validateRequest(UserSchema.getUsersQuerySchema),
  UserController.getAllUsers,
);

router.get("/:id", UserController.getUserById);

router.patch(
  "/:id/role",
  validateRequest(UserSchema.updateRoleSchema),
  UserController.updateUserRole,
);

router.patch(
  "/:id/status",
  validateRequest(UserSchema.updateStatusSchema),
  UserController.updateUserStatus,
);

router.delete("/:id", UserController.deleteUser);

export const UserRoutes = router;
