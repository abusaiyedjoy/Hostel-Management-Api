import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { PaymentSchema } from "./payment.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// ─── Public (bKash hits this) ──────────────────────
router.get("/callback", PaymentController.handleCallback);

// ─── Member ────────────────────────────────────────
router.post(
  "/initiate",
  authorize("MEMBER"),
  validateRequest(PaymentSchema.initiatePaymentSchema),
  PaymentController.initiatePayment,
);

router.get(
  "/my-payments",
  authorize("LOGGED_IN"),
  validateRequest(PaymentSchema.getPaymentsQuerySchema),
  PaymentController.getMyPayments,
);

router.get(
  "/:id/status",
  authorize("LOGGED_IN"),
  PaymentController.queryPaymentStatus,
);

router.get("/:id", authorize("LOGGED_IN"), PaymentController.getPaymentById);

// ─── Admin ─────────────────────────────────────────
router.get(
  "/admin/all",
  authorize("ADMIN"),
  validateRequest(PaymentSchema.getPaymentsQuerySchema),
  PaymentController.getAllPayments,
);

router.post(
  "/:id/refund",
  authorize("ADMIN"),
  validateRequest(PaymentSchema.refundPaymentSchema),
  PaymentController.refundPayment,
);

export const PaymentRoutes = router;
