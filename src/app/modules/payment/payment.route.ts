import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller";
import { PaymentSchema } from "./payment.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// ─── Member: initiate payment ──────────────────────
router.post(
  "/initiate",
  authorize("MEMBER"),
  validateRequest(PaymentSchema.initiatePaymentSchema),
  PaymentController.initiatePayment,
);

// ─── bKash callback (public) ──────────────────────
router.get("/bkash/callback", PaymentController.handleBkashCallback);

// ─── Stripe webhook (raw body required) ───────────
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhook,
);

// ─── SSLCommerz callbacks (public) ────────────────
router.post("/ssl/success", PaymentController.handleSslSuccess);
router.post("/ssl/fail", PaymentController.handleSslFail);
router.post("/ssl/cancel", PaymentController.handleSslCancel);
router.post("/ssl/ipn", PaymentController.handleSslIPN);

// ─── Authenticated: history ────────────────────────
router.get(
  "/my-payments",
  authorize("LOGGED_IN"),
  validateRequest(PaymentSchema.getPaymentsQuerySchema),
  PaymentController.getMyPayments,
);

router.get("/:id", authorize("LOGGED_IN"), PaymentController.getPaymentById);

// ─── Admin only ────────────────────────────────────
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
