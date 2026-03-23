import { Router } from "express";
import { OtpController } from "./otp.controller";
import { OtpSchema } from "./otp.validation";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// All OTP routes are public (no auth needed)
router.post(
  "/send",
  validateRequest(OtpSchema.sendOtpSchema),
  OtpController.send,
);

router.post(
  "/verify",
  validateRequest(OtpSchema.verifyOtpSchema),
  OtpController.verify,
);

router.get(
  "/status",
  validateRequest(OtpSchema.otpStatusSchema),
  OtpController.status,
);

export const OtpRoutes = router;
