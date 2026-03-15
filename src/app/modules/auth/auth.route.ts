import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";
import { AuthSchema } from "./auth.validation";

const router = Router();

// ─── Public Routes ────────────────────────────────
router.post(
  "/register",
  validateRequest(AuthSchema.registerSchema),
  AuthController.register,
);

router.post(
  "/login",
  validateRequest(AuthSchema.loginSchema),
  AuthController.login,
);

// ─── Protected Routes ─────────────────────────────
router.get("/me", authorize("LOGGED_IN"), AuthController.getMe);

router.patch(
  "/change-password",
  authorize("LOGGED_IN"),
  validateRequest(AuthSchema.changePasswordSchema),
  AuthController.changePassword,
);

router.patch(
  "/update-profile",
  authorize("LOGGED_IN"),
  validateRequest(AuthSchema.updateProfileSchema),
  AuthController.updateProfile,
);

export const AuthRoutes = router;
