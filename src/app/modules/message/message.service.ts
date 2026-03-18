import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import type { TGetMessagesQuery } from "./message.validation";

const messageSelect = {
  id: true,
  content: true,
  type: true,
  isEdited: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  sender: {
    select: { id: true, name: true, role: true, image: true },
  },
} as const;

const getMessMessages = async (
  messId: string,
  query: TGetMessagesQuery,
  userId: string,
  userRole: string,
) => {
  // Verify access
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { id: true, managerId: true },
  });

  if (!mess) throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);

  if (userRole === "MEMBER") {
    const member = await prisma.member.findFirst({
      where: { messId, userId, isActive: true },
      select: { id: true },
    });
    if (!member) throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);
  }

  if (userRole === "MEAL_MANAGER") {
    const mm = await prisma.mealManager.findFirst({
      where: { messId, userId, isActive: true },
      select: { id: true },
    });
    if (!mm) throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);
  }

  if (userRole === "MESS_MANAGER" && mess.managerId !== userId) {
    throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);
  }

  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "30");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { messId };

  if (query.before) {
    where.createdAt = { lt: new Date(query.before) };
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      select: messageSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.count({ where }),
  ]);

  return {
    messages: messages.reverse(),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const deleteMessage = async (
  messageId: string,
  userId: string,
  userRole: string,
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true },
  });

  if (!message) throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND);

  const canDelete =
    message.senderId === userId ||
    userRole === "ADMIN" ||
    userRole === "MESS_MANAGER";

  if (!canDelete) {
    throw new AppError("Cannot delete this message", HTTP_STATUS.FORBIDDEN);
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: "This message was deleted" },
  });

  return { message: "Message deleted successfully" };
};

export const MessageService = { getMessMessages, deleteMessage };
