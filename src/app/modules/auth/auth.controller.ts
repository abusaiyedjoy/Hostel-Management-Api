import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { AuthService } from "./auth.service";

const register = handleController(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.CREATED,
    success: true,
    message: "Registration successful",
    data: result,
  });
});

const login = handleController(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Login successful",
    data: result,
  });
});

const getMe = handleController(async (req: Request, res: Response) => {
  const user = await AuthService.getMe(req.user!.id);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

const changePassword = handleController(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const updateProfile = handleController(async (req: Request, res: Response) => {
  const user = await AuthService.updateProfile(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// POST /api/auth/send-verify-otp
const sendVerifyAccountOtp = handleController(
  async (req: Request, res: Response) => {
    const result = await AuthService.sendVerifyAccountOtp(req.body);
    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: result.message,
      data: { expiresInSeconds: result.expiresInSeconds },
    });
  },
);

// POST /api/auth/verify-account
const verifyAccount = handleController(async (req: Request, res: Response) => {
  const result = await AuthService.verifyAccount(req.body);
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: { accessToken: result.accessToken },
  });
});

// POST /api/auth/forgot-password
const forgotPassword = handleController(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: { expiresInSeconds: result.expiresInSeconds },
  });
});

// POST /api/auth/reset-password
const resetPassword = handleController(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);
  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// Add to AuthController export:
export const AuthController = {
  register,
  login,
  getMe,
  changePassword,
  updateProfile,
  sendVerifyAccountOtp, // ← new
  verifyAccount, // ← new
  forgotPassword, // ← new
  resetPassword, // ← new
};
