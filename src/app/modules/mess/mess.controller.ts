import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { MessService } from "./mess.service";

// POST /api/mess
const createMess = handleController(async (req: Request, res: Response) => {
  const mess = await MessService.createMess(req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.CREATED,
    success: true,
    message: "Mess created successfully",
    data: mess,
  });
});

// GET /api/mess
const getAllMess = handleController(async (req: Request, res: Response) => {
  const result = await MessService.getAllMess(req.query as any);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Mess list fetched successfully",
    meta: result.meta,
    data: result.mess,
  });
});

// GET /api/mess/my-mess
const getMyMess = handleController(async (req: Request, res: Response) => {
  const mess = await MessService.getMyMess(req.user!.id);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Your mess fetched successfully",
    data: mess,
  });
});

// GET /api/mess/:id
const getMessById = handleController(async (req: Request, res: Response) => {
  const mess = await MessService.getMessById(req.params.id as string);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Mess fetched successfully",
    data: mess,
  });
});

// GET /api/mess/:id/stats
const getMessStats = handleController(async (req: Request, res: Response) => {
  const stats = await MessService.getMessStats(req.params.id as string);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Mess stats fetched successfully",
    data: stats,
  });
});

// PATCH /api/mess/:id
const updateMess = handleController(async (req: Request, res: Response) => {
  const mess = await MessService.updateMess(
    req.params.id as string,
    req.body,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Mess updated successfully",
    data: mess,
  });
});

// DELETE /api/mess/:id
const deleteMess = handleController(async (req: Request, res: Response) => {
  const result = await MessService.deleteMess(req.params.id as string);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const MessController = {
  createMess,
  getAllMess,
  getMyMess,
  getMessById,
  getMessStats,
  updateMess,
  deleteMess,
};
