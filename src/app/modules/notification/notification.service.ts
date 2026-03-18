import { NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import type {
  TGetNotificationsQuery,
  TMarkReadInput,
} from "./notification.validation";
import { emitToUser } from "../../utils/socket";

// ─── Types ────────────────────────────────────────
type TCreateNotificationPayload = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  messId?: string;
  relatedId?: string;
  relatedType?: string;
};

type TCreateBulkNotificationPayload = {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  messId?: string;
  relatedId?: string;
  relatedType?: string;
};

// Reusable select
const notificationSelect = {
  id: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  readAt: true,
  relatedId: true,
  relatedType: true,
  messId: true,
  createdAt: true,
} as const;

// ==================== CREATE (single) ====================
const create = async (payload: TCreateNotificationPayload) => {
  const notification = await prisma.notification.create({
    data: { ...payload },
    select: notificationSelect,
  });

  // Emit real-time to that user
  try {
    emitToUser(payload.userId, "notification:new", notification);

    const unreadCount = await prisma.notification.count({
      where: { userId: payload.userId, isRead: false },
    });
    emitToUser(payload.userId, "notification:unread-count", { unreadCount });
  } catch {
    // Socket might not be initialized during seeding — ignore
  }

  return notification;
};

// ==================== CREATE BULK with message ====================
const createBulk = async (payload: TCreateBulkNotificationPayload) => {
  const notifications = await prisma.notification.createMany({
    data: payload.userIds.map((userId) => ({
      userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      messId: payload.messId,
      relatedId: payload.relatedId,
      relatedType: payload.relatedType,
    })),
    select: notificationSelect,
  });

  // Emit real-time to those users
  try {
    payload.userIds.forEach((userId) => {
      emitToUser(userId, "notification:new", notifications);

      const unreadCount = prisma.notification.count({
        where: { userId, isRead: false },
      });
      emitToUser(userId, "notification:unread-count", { unreadCount });
    });
  } catch {
    // Socket might not be initialized during seeding — ignore
  }

  return notifications;
};

// ==================== NOTIFY ALL MESS MEMBERS ====================
const notifyMessMembers = async (
  messId: string,
  payload: Omit<TCreateBulkNotificationPayload, "userIds" | "messId">,
) => {
  const members = await prisma.member.findMany({
    where: { messId, isActive: true },
    select: { userId: true },
  });

  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return;

  await createBulk({ ...payload, userIds, messId });
};

// ==================== NOTIFY MESS MANAGERS ====================
const notifyMessManager = async (
  messId: string,
  payload: Omit<TCreateBulkNotificationPayload, "userIds" | "messId">,
) => {
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { managerId: true },
  });

  if (!mess) return;

  await create({ ...payload, userId: mess.managerId, messId });
};

// ==================== NOTIFY ADMINS ====================
const notifyAdmins = async (
  payload: Omit<TCreateBulkNotificationPayload, "userIds">,
) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  const userIds = admins.map((a) => a.id);
  if (userIds.length === 0) return;

  await createBulk({ ...payload, userIds });
};

// ==================== GET MY NOTIFICATIONS ====================
const getMyNotifications = async (
  userId: string,
  query: TGetNotificationsQuery,
) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (query.isRead !== undefined) {
    where.isRead = query.isRead;
  }

  if (query.type) {
    where.type = query.type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==================== GET UNREAD COUNT ====================
const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { unreadCount: count };
};

// ==================== MARK AS READ ====================
const markAsRead = async (userId: string, payload: TMarkReadInput) => {
  // Verify all notifications belong to the user
  const notifications = await prisma.notification.findMany({
    where: {
      id: { in: payload.notificationIds },
      userId,
    },
    select: { id: true },
  });

  if (notifications.length !== payload.notificationIds.length) {
    throw new AppError(
      "Some notifications not found or do not belong to you",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: payload.notificationIds },
      userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { message: `${notifications.length} notification(s) marked as read` };
};

// ==================== MARK ALL AS READ ====================
const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { message: `${result.count} notification(s) marked as read` };
};

// ==================== DELETE NOTIFICATION ====================
const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) {
    throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
  }

  if (notification.userId !== userId) {
    throw new AppError(
      "You can only delete your own notifications",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  await prisma.notification.delete({ where: { id: notificationId } });

  return { message: "Notification deleted successfully" };
};

// ==================== CLEAR ALL ====================
const clearAll = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  });

  return { message: `${result.count} notification(s) cleared` };
};

export const NotificationService = {
  // Internal helpers (used by other services)
  create,
  createBulk,
  notifyMessMembers,
  notifyMessManager,
  notifyAdmins,
  // API handlers
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
};
