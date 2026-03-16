import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import type {
  TUpdateRoleInput,
  TUpdateStatusInput,
  TGetUsersQuery,
} from "./user.validation";
import { NotificationService } from "../notification/notification.service";

// Safe user fields reused across queries
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  image: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ==================== ADMIN SERVICES ====================

const getAllUsers = async (query: TGetUsersQuery) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  // Build dynamic filters
  const where: Record<string, unknown> = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...safeUserSelect,
        member: {
          select: {
            id: true,
            registrationNo: true,
            mess: { select: { id: true, name: true } },
          },
        },
        mealManager: {
          select: {
            id: true,
            mess: { select: { id: true, name: true } },
          },
        },
        messManager: {
          select: { id: true, name: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...safeUserSelect,
      member: {
        select: {
          id: true,
          registrationNo: true,
          dateOfJoining: true,
          totalBalance: true,
          mess: {
            select: { id: true, name: true, city: true, ratePerMeal: true },
          },
          mealEntries: {
            select: {
              id: true,
              status: true,
              cost: true,
              meal: {
                select: {
                  id: true,
                  mealType: true,
                  date: true,
                  costPerMeal: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
      mealManager: {
        select: {
          id: true,
          isActive: true,
          mess: {
            select: { id: true, name: true, city: true },
          },
        },
      },
      messManager: {
        select: {
          id: true,
          name: true,
          email: true,
          city: true,
          capacity: true,
          ratePerMeal: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

const updateUserRole = async (
  targetUserId: string,
  payload: TUpdateRoleInput,
  requesterId: string,
) => {
  // Prevent self role change
  if (targetUserId === requesterId) {
    throw new AppError(
      "You cannot change your own role",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  // Prevent changing another admin's role
  if (user.role === Role.ADMIN) {
    throw new AppError("Cannot change role of an admin", HTTP_STATUS.FORBIDDEN);
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: payload.role },
    select: safeUserSelect,
  });

  await NotificationService.create({
    userId: targetUserId,
    title: "Your role has been updated",
    message: `Your account role has been changed to ${payload.role}.`,
    type: "ROLE",
    relatedId: targetUserId,
    relatedType: "USER",
  });

  return updatedUser;
};

const updateUserStatus = async (
  targetUserId: string,
  payload: TUpdateStatusInput,
  requesterId: string,
) => {
  // Prevent self deactivation
  if (targetUserId === requesterId) {
    throw new AppError(
      "You cannot change your own account status",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  // Prevent deactivating another admin
  if (user.role === Role.ADMIN) {
    throw new AppError(
      "Cannot change status of an admin",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: payload.isActive },
    select: safeUserSelect,
  });

  await NotificationService.create({
    userId: targetUserId,
    title: `Account ${payload.isActive ? "activated" : "deactivated"}`,
    message: `Your account has been ${payload.isActive ? "activated" : "deactivated"}.`,
    type: "SYSTEM",
    relatedId: targetUserId,
    relatedType: "USER",
  });

  return updatedUser;
};

const deleteUser = async (targetUserId: string, requesterId: string) => {
  // Prevent self deletion
  if (targetUserId === requesterId) {
    throw new AppError(
      "You cannot delete your own account",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  // Prevent deleting another admin
  if (user.role === Role.ADMIN) {
    throw new AppError("Cannot delete an admin account", HTTP_STATUS.FORBIDDEN);
  }

  await prisma.user.delete({ where: { id: targetUserId } });

  return { message: "User deleted successfully" };
};

// ==================== STATS SERVICE ====================

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalMess,
    totalMembers,
    totalMeals,
    totalMealEntries,
    usersByRole,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.mess.count(),
    prisma.member.count(),
    prisma.meal.count(),
    prisma.mealEntry.count(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  const roleStats = usersByRole.reduce(
    (acc, curr) => {
      acc[curr.role] = curr._count.role;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalUsers,
    totalMess,
    totalMembers,
    totalMeals,
    totalMealEntries,
    usersByRole: roleStats,
  };
};

export const UserService = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getDashboardStats,
};
