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

export const AuthController = {
  register,
  login,
  getMe,
  changePassword,
  updateProfile,
};
