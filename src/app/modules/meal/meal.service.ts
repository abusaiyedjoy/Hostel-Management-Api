import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { NotificationService } from "../notification/notification.service";
import type {
  TAssignMealManagerInput,
  TGetMealManagersQuery,
  TUpdateMealManagerStatus,
} from "./meal.validation";

// Reusable select
const mealManagerSelect = {
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      isActive: true,
    },
  },
  mess: {
    select: {
      id: true,
      name: true,
      city: true,
      ratePerMeal: true,
    },
  },
} as const;

// ==================== ASSIGN MEAL MANAGER ====================
const assignMealManager = async (
  messId: string,
  payload: TAssignMealManagerInput,
  requesterId: string,
  requesterRole: string,
) => {
  // Verify mess exists
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { id: true, managerId: true, name: true },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only assign to their own mess
  if (requesterRole === "MESS_MANAGER" && mess.managerId !== requesterId) {
    throw new AppError(
      "You can only assign meal managers to your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      name: true,
      mealManager: { select: { id: true } },
    },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  // Check if user is already a meal manager anywhere
  if (user.mealManager) {
    throw new AppError(
      "This user is already a meal manager in a mess",
      HTTP_STATUS.CONFLICT,
    );
  }

  // Cannot assign a mess manager or admin as meal manager
  if (user.role === "ADMIN" || user.role === "MESS_MANAGER") {
    throw new AppError(
      `A ${user.role} cannot be assigned as a meal manager`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Update user role to MEAL_MANAGER
  await prisma.user.update({
    where: { id: payload.userId },
    data: { role: "MEAL_MANAGER" },
  });

  const mealManager = await prisma.mealManager.create({
    data: {
      userId: payload.userId,
      messId,
    },
    select: mealManagerSelect,
  });

  await NotificationService.create({
    userId: payload.userId,
    title: "You are now a meal manager",
    message: `You have been assigned as meal manager for ${mealManager.mess.name}.`,
    type: "MESS",
    messId: messId,
    relatedId: mealManager.id,
    relatedType: "MEAL_MANAGER",
  });

  return mealManager;
};

// ==================== GET ALL MEAL MANAGERS ====================
const getAllMealManagers = async (
  messId: string,
  query: TGetMealManagersQuery,
  requesterId: string,
  requesterRole: string,
) => {
  // Verify mess exists
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { id: true, managerId: true },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only view meal managers of their own mess
  if (requesterRole === "MESS_MANAGER" && mess.managerId !== requesterId) {
    throw new AppError(
      "You can only view meal managers of your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { messId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.user = {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }

  const [mealManagers, total] = await Promise.all([
    prisma.mealManager.findMany({
      where,
      select: {
        ...mealManagerSelect,
        _count: {
          select: { meals: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.mealManager.count({ where }),
  ]);

  return {
    mealManagers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==================== GET MEAL MANAGER BY ID ====================
const getMealManagerById = async (
  mealManagerId: string,
  requesterId: string,
  requesterRole: string,
) => {
  const mealManager = await prisma.mealManager.findUnique({
    where: { id: mealManagerId },
    select: {
      ...mealManagerSelect,
      meals: {
        select: {
          id: true,
          mealType: true,
          date: true,
          costPerMeal: true,
          totalCost: true,
          _count: { select: { mealEntries: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      },
      _count: {
        select: { meals: true },
      },
    },
  });

  if (!mealManager) {
    throw new AppError("Meal manager not found", HTTP_STATUS.NOT_FOUND);
  }

  // Meal manager can only view their own profile
  if (requesterRole === "MEAL_MANAGER" && mealManager.user.id !== requesterId) {
    throw new AppError(
      "You can only view your own profile",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  return mealManager;
};

// ==================== GET MY MEAL MANAGER PROFILE ====================
const getMyMealManagerProfile = async (userId: string) => {
  const mealManager = await prisma.mealManager.findUnique({
    where: { userId },
    select: {
      ...mealManagerSelect,
      meals: {
        select: {
          id: true,
          mealType: true,
          date: true,
          costPerMeal: true,
          totalCost: true,
          _count: { select: { mealEntries: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      },
      _count: {
        select: { meals: true },
      },
    },
  });

  if (!mealManager) {
    throw new AppError(
      "You are not a meal manager of any mess",
      HTTP_STATUS.NOT_FOUND,
    );
  }

  return mealManager;
};

// ==================== UPDATE MEAL MANAGER STATUS ====================
const updateMealManagerStatus = async (
  mealManagerId: string,
  payload: TUpdateMealManagerStatus,
  requesterId: string,
  requesterRole: string,
) => {
  const mealManager = await prisma.mealManager.findUnique({
    where: { id: mealManagerId },
    select: {
      id: true,
      mess: { select: { managerId: true } },
    },
  });

  if (!mealManager) {
    throw new AppError("Meal manager not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only update meal managers of their own mess
  if (
    requesterRole === "MESS_MANAGER" &&
    mealManager.mess.managerId !== requesterId
  ) {
    throw new AppError(
      "You can only update meal managers of your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const updated = await prisma.mealManager.update({
    where: { id: mealManagerId },
    data: { isActive: payload.isActive },
    select: mealManagerSelect,
  });

  return updated;
};

// ==================== REMOVE MEAL MANAGER ====================
const removeMealManager = async (
  mealManagerId: string,
  requesterId: string,
  requesterRole: string,
) => {
  const mealManager = await prisma.mealManager.findUnique({
    where: { id: mealManagerId },
    select: {
      id: true,
      userId: true,
      mess: { select: { managerId: true } },
    },
  });

  if (!mealManager) {
    throw new AppError("Meal manager not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only remove meal managers from their own mess
  if (
    requesterRole === "MESS_MANAGER" &&
    mealManager.mess.managerId !== requesterId
  ) {
    throw new AppError(
      "You can only remove meal managers from your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  // Revert user role back to MEMBER
  await prisma.user.update({
    where: { id: mealManager.userId },
    data: { role: "MEMBER" },
  });

  await NotificationService.create({
    userId: mealManager.userId,
    title: "Meal manager role removed",
    message: "You have been removed from the meal manager role.",
    type: "MESS",
  });

  await prisma.mealManager.delete({ where: { id: mealManagerId } });

  return { message: "Meal manager removed successfully" };
};

// ==================== GET MEAL MANAGER STATS ====================
const getMealManagerStats = async (mealManagerId: string) => {
  const mealManager = await prisma.mealManager.findUnique({
    where: { id: mealManagerId },
    select: { id: true },
  });

  if (!mealManager) {
    throw new AppError("Meal manager not found", HTTP_STATUS.NOT_FOUND);
  }

  const [totalMeals, mealsByType, recentMeals] = await Promise.all([
    prisma.meal.count({ where: { mealManagerId } }),

    prisma.meal.groupBy({
      by: ["mealType"],
      where: { mealManagerId },
      _count: { mealType: true },
      _sum: { totalCost: true },
    }),

    prisma.meal.findMany({
      where: { mealManagerId },
      select: {
        id: true,
        mealType: true,
        date: true,
        costPerMeal: true,
        totalCost: true,
        _count: { select: { mealEntries: true } },
      },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  const mealTypeStats = mealsByType.reduce(
    (acc, curr) => {
      acc[curr.mealType] = {
        count: curr._count.mealType,
        totalCost: curr._sum.totalCost || 0,
      };
      return acc;
    },
    {} as Record<string, { count: number; totalCost: number }>,
  );

  return {
    totalMeals,
    mealsByType: mealTypeStats,
    recentMeals,
  };
};

export const MealManagerService = {
  assignMealManager,
  getAllMealManagers,
  getMealManagerById,
  getMyMealManagerProfile,
  updateMealManagerStatus,
  removeMealManager,
  getMealManagerStats,
};
