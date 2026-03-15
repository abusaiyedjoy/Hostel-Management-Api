import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { UserService } from "./user.service";

// Dashboard Stats
const getDashboardStats = handleController(
  async (_req: Request, res: Response) => {
    const stats = await UserService.getDashboardStats();

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Dashboard stats fetched successfully",
      data: stats,
    });
  },
);

// All Users
const getAllUsers = handleController(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers(req.query as any);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Users fetched successfully",
    meta: result.meta,
    data: result.users,
  });
});

// Single User by ID
const getUserById = handleController(async (req: Request, res: Response) => {
  const user = await UserService.getUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});

// Update User Role
const updateUserRole = handleController(async (req: Request, res: Response) => {
  const user = await UserService.updateUserRole(
    req.params.id as string,
    req.body,
    req.user!.id,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "User role updated successfully",
    data: user,
  });
});

// Update User Status
const updateUserStatus = handleController(
  async (req: Request, res: Response) => {
    const user = await UserService.updateUserStatus(
      req.params.id as string,
      req.body,
      req.user!.id,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: `User ${req.body.isActive ? "activated" : "deactivated"} successfully`,
      data: user,
    });
  },
);

// Delete User
const deleteUser = handleController(async (req: Request, res: Response) => {
  const result = await UserService.deleteUser(
    req.params.id as string,
    req.user!.id,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const UserController = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
