import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { MessageService } from "./message.service";

const getMessMessages = handleController(
  async (req: Request, res: Response) => {
    const result = await MessageService.getMessMessages(
      req.params.messId as string,
      req.query as any,
      req.user!.id,
      req.user!.role,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Messages fetched successfully",
      meta: result.meta,
      data: result.messages,
    });
  },
);

const deleteMessage = handleController(async (req: Request, res: Response) => {
  const result = await MessageService.deleteMessage(
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

export const MessageController = { getMessMessages, deleteMessage };
