import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { MemberService } from "./member.service";

// POST /api/mess/:messId/members
const addMember = handleController(async (req: Request, res: Response) => {
  const member = await MemberService.addMember(
    { ...req.body, messId: req.params.messId },
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.CREATED,
    success: true,
    message: "Member added successfully",
    data: member,
  });
});

// GET /api/mess/:messId/members
const getAllMembers = handleController(async (req: Request, res: Response) => {
  const result = await MemberService.getAllMembers(
    req.params.messId as string,
    req.query as any,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Members fetched successfully",
    meta: result.meta,
    data: result.members,
  });
});

// GET /api/members/my-profile
const getMyMemberProfile = handleController(
  async (req: Request, res: Response) => {
    const member = await MemberService.getMyMemberProfile(req.user!.id);

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Your member profile fetched successfully",
      data: member,
    });
  },
);

// GET /api/mess/:messId/members/:id
const getMemberById = handleController(async (req: Request, res: Response) => {
  const member = await MemberService.getMemberById(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Member fetched successfully",
    data: member,
  });
});

// GET /api/members/:id/meal-summary
const getMemberMealSummary = handleController(
  async (req: Request, res: Response) => {
    const summary = await MemberService.getMemberMealSummary(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Meal summary fetched successfully",
      data: summary,
    });
  },
);

// PATCH /api/mess/:messId/members/:id
const updateMember = handleController(async (req: Request, res: Response) => {
  const member = await MemberService.updateMember(
    req.params.id as string,
    req.body,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Member updated successfully",
    data: member,
  });
});

// DELETE /api/mess/:messId/members/:id
const removeMember = handleController(async (req: Request, res: Response) => {
  const result = await MemberService.removeMember(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const MemberController = {
  addMember,
  getAllMembers,
  getMyMemberProfile,
  getMemberById,
  getMemberMealSummary,
  updateMember,
  removeMember,
};
