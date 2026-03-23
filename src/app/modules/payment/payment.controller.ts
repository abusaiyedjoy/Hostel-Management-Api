import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { PaymentService } from "./payment.service";
import { env } from "../../config/env";

const initiatePayment = handleController(
  async (req: Request, res: Response) => {
    const result = await PaymentService.initiatePayment(req.body, req.user!.id);
    sendResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      success: true,
      message: "Payment initiated. Redirect user to the provided URL.",
      data: result,
    });
  },
);

// ── bKash callback (GET, public) ──────────────────
const handleBkashCallback = handleController(
  async (req: Request, res: Response) => {
    const result = await PaymentService.handleBkashCallback(req.query as any);
    sendResponse(res, {
      statusCode: result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST,
      success: result.success,
      message: result.message,
      data: result,
    });
  },
);

// ── Stripe webhook (POST, raw body, public) ───────
const handleStripeWebhook = handleController(
  async (req: Request, res: Response) => {
    const result = await PaymentService.handleStripeWebhook(req);
    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Webhook received",
      data: result,
    });
  },
);

// ── SSL success (POST, public) ────────────────────
const handleSslSuccess = handleController(
  async (req: Request, res: Response) => {
    const result = await PaymentService.handleSslSuccess(req.body);
    if (result.success) {
      res.redirect(env.SSL.FRONTEND_SUCCESS_URL);
    } else {
      res.redirect(env.SSL.FRONTEND_FAIL_URL);
    }
  },
);

// ── SSL fail (POST, public) ───────────────────────
const handleSslFail = handleController(async (req: Request, res: Response) => {
  await PaymentService.handleSslFailOrCancel(req.body, "FAILED");
  res.redirect(env.SSL.FRONTEND_FAIL_URL);
});

// ── SSL cancel (POST, public) ─────────────────────
const handleSslCancel = handleController(
  async (req: Request, res: Response) => {
    await PaymentService.handleSslFailOrCancel(req.body, "CANCELLED");
    res.redirect(env.SSL.FRONTEND_FAIL_URL);
  },
);

// ── SSL IPN (POST, public) ────────────────────────
const handleSslIPN = handleController(async (req: Request, res: Response) => {
  const result = await PaymentService.handleSslIPN(req.body);
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "IPN received",
    data: result,
  });
});

const getMyPayments = handleController(async (req: Request, res: Response) => {
  const result = await PaymentService.getMyPayments(
    req.user!.id,
    req.query as any,
  );
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Payments fetched successfully",
    meta: result.meta,
    data: result.payments,
  });
});

const getAllPayments = handleController(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPayments(req.query as any);
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "All payments fetched",
    meta: result.meta,
    data: { payments: result.payments, stats: result.stats },
  });
});

const getPaymentById = handleController(async (req: Request, res: Response) => {
  const payment = await PaymentService.getPaymentById(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Payment fetched",
    data: payment,
  });
});

const refundPayment = handleController(async (req: Request, res: Response) => {
  const result = await PaymentService.refundPayment(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const PaymentController = {
  initiatePayment,
  handleBkashCallback,
  handleStripeWebhook,
  handleSslSuccess,
  handleSslFail,
  handleSslCancel,
  handleSslIPN,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  refundPayment,
};
