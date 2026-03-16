import { Request, Response } from "express";
import handleController from "../../utils/asyncHandler";
import sendResponse from "../../utils/response";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { NotificationService } from "./notification.service";

// GET /api/notifications
const getMyNotifications = handleController(
  async (req: Request, res: Response) => {
    const result = await NotificationService.getMyNotifications(
      req.user!.id,
      req.query as any,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Notifications fetched successfully",
      meta: result.meta,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
    });
  },
);

// GET /api/notifications/unread-count
const getUnreadCount = handleController(async (req: Request, res: Response) => {
  const result = await NotificationService.getUnreadCount(req.user!.id);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Unread count fetched successfully",
    data: result,
  });
});

// PATCH /api/notifications/mark-read
const markAsRead = handleController(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// PATCH /api/notifications/mark-all-read
const markAllAsRead = handleController(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.id);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// DELETE /api/notifications/clear-all
const clearAll = handleController(async (req: Request, res: Response) => {
  const result = await NotificationService.clearAll(req.user!.id);

  sendResponse(res, {
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// DELETE /api/notifications/:id
const deleteNotification = handleController(
  async (req: Request, res: Response) => {
    const result = await NotificationService.deleteNotification(
      req.params.id as string,
      req.user!.id,
    );

    sendResponse(res, {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: result.message,
      data: null,
    });
  },
);

export const NotificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearAll,
  deleteNotification,
};
