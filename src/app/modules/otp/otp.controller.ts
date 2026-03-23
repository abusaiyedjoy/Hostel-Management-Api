import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { sendOtp, verifyOtp, getOtpStatus } from "./otp.service";

// POST /api/otp/send
const send = handleController(async (req: Request, res: Response) => {
  const result = await sendOtp(req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: { expiresInSeconds: result.expiresInSeconds },
  });
});

// POST /api/otp/verify
const verify = handleController(async (req: Request, res: Response) => {
  const user = await verifyOtp(req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "OTP verified successfully",
    data: { userId: user.id, email: user.email, role: user.role },
  });
});

// GET /api/otp/status
const status = handleController(async (req: Request, res: Response) => {
  const { identifier, purpose } = req.query as {
    identifier: string;
    purpose: any;
  };

  const result = await getOtpStatus(identifier, purpose);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "OTP status fetched",
    data: result,
  });
});

export const OtpController = { send, verify, status };
