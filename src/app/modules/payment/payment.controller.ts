import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { PaymentService } from "./payment.service";

// POST /api/payment/initiate
const initiatePayment = handleController(
  async (req: Request, res: Response) => {
    const result = await PaymentService.initiatePayment(req.body, req.user!.id);

    sendResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      success: true,
      message: "Payment initiated. Redirect user to bkashURL.",
      data: result,
    });
  },
);

// GET /api/payment/callback  (called by bKash — no auth)
const handleCallback = handleController(async (req: Request, res: Response) => {
  const result = await PaymentService.handleCallback(req.query as any);

  // bKash expects a redirect — send JSON for API clients
  sendResponse(res, {
    statusCode: result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST,
    success: result.success,
    message: result.message,
    data: result,
  });
});

// GET /api/payment/my-payments
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

// GET /api/payment/all  (Admin)
const getAllPayments = handleController(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPayments(req.query as any);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "All payments fetched successfully",
    meta: result.meta,
    data: { payments: result.payments, stats: result.stats },
  });
});

// GET /api/payment/:id
const getPaymentById = handleController(async (req: Request, res: Response) => {
  const payment = await PaymentService.getPaymentById(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Payment fetched successfully",
    data: payment,
  });
});

// GET /api/payment/:id/status
const queryPaymentStatus = handleController(
  async (req: Request, res: Response) => {
    const result = await PaymentService.queryPaymentStatus(
      req.params.id as string,
      req.user!.id,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Payment status fetched",
      data: result,
    });
  },
);

// POST /api/payment/:id/refund  (Admin)
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
  handleCallback,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  queryPaymentStatus,
  refundPayment,
};
