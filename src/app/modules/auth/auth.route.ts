import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthSchema } from "./auth.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// ─── Public ───────────────────────────────────────
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

// ─── Account verification ─────────────────────────
router.post(
  "/send-verify-otp",
  validateRequest(AuthSchema.forgotPasswordSchema),
  AuthController.sendVerifyAccountOtp,
);
router.post(
  "/verify-account",
  validateRequest(AuthSchema.verifyAccountSchema),
  AuthController.verifyAccount,
);

// ─── Forgot password flow ─────────────────────────
router.post(
  "/forgot-password",
  validateRequest(AuthSchema.forgotPasswordSchema),
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  validateRequest(AuthSchema.resetPasswordSchema),
  AuthController.resetPassword,
);

// ─── Protected ────────────────────────────────────
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
