import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import type {
  TCreateMealInput,
  TUpdateMealInput,
  TGetMealsQuery,
  TCreateMealEntryInput,
  TBulkCreateMealEntryInput,
  TUpdateMealEntryInput,
} from "./mealManager.validation";

// Reusable meal select
const mealSelect = {
  id: true,
  mealType: true,
  date: true,
  costPerMeal: true,
  totalCost: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  mess: {
    select: { id: true, name: true, city: true },
  },
  mealManager: {
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  _count: {
    select: { mealEntries: true },
  },
} as const;

// Reusable meal entry select
const mealEntrySelect = {
  id: true,
  status: true,
  cost: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: {
      id: true,
      registrationNo: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  meal: {
    select: {
      id: true,
      mealType: true,
      date: true,
      costPerMeal: true,
    },
  },
} as const;

// ==================== HELPER ====================
const verifyMessAccess = async (
  messId: string,
  userId: string,
  userRole: string,
) => {
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: {
      id: true,
      managerId: true,
      mealManagers: {
        where: { userId, isActive: true },
        select: { id: true },
      },
    },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  if (userRole === "ADMIN") return mess;

  if (userRole === "MESS_MANAGER" && mess.managerId !== userId) {
    throw new AppError(
      "You can only manage meals of your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  if (userRole === "MEAL_MANAGER" && mess.mealManagers.length === 0) {
    throw new AppError(
      "You are not a meal manager of this mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  return mess;
};

// ==================== CREATE MEAL ====================
const createMeal = async (
  messId: string,
  payload: TCreateMealInput,
  userId: string,
  userRole: string,
) => {
  await verifyMessAccess(messId, userId, userRole);

  // Get meal manager record
  const mealManager = await prisma.mealManager.findUnique({
    where: { userId },
    select: { id: true },
  });

  // Admin/Mess manager must have a meal manager assigned
  let mealManagerId = mealManager?.id;

  if (!mealManagerId) {
    // If admin or mess manager, find any active meal manager of that mess
    const activeMealManager = await prisma.mealManager.findFirst({
      where: { messId, isActive: true },
      select: { id: true },
    });

    if (!activeMealManager) {
      throw new AppError(
        "No active meal manager found for this mess",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    mealManagerId = activeMealManager.id;
  }

  // Check duplicate meal (same type + date + mess)
  const existingMeal = await prisma.meal.findFirst({
    where: {
      messId,
      mealType: payload.mealType,
      date: payload.date,
    },
    select: { id: true },
  });

  if (existingMeal) {
    throw new AppError(
      `A ${payload.mealType} meal already exists for this date`,
      HTTP_STATUS.CONFLICT,
    );
  }

  const meal = await prisma.meal.create({
    data: {
      mealType: payload.mealType,
      date: payload.date,
      costPerMeal: payload.costPerMeal,
      note: payload.note,
      messId,
      mealManagerId,
    },
    select: mealSelect,
  });

  return meal;
};

// ==================== GET ALL MEALS ====================
const getAllMeals = async (
  messId: string,
  query: TGetMealsQuery,
  userId: string,
  userRole: string,
) => {
  await verifyMessAccess(messId, userId, userRole);

  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { messId };

  if (query.mealType) {
    where.mealType = query.mealType;
  }

  if (query.startDate || query.endDate) {
    where.date = {
      ...(query.startDate && { gte: new Date(query.startDate) }),
      ...(query.endDate && { lte: new Date(query.endDate) }),
    };
  }

  const [meals, total] = await Promise.all([
    prisma.meal.findMany({
      where,
      select: mealSelect,
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.meal.count({ where }),
  ]);

  return {
    meals,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==================== GET MEAL BY ID ====================
const getMealById = async (
  mealId: string,
  userId: string,
  userRole: string,
) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: {
      ...mealSelect,
      mealEntries: {
        select: mealEntrySelect,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!meal) {
    throw new AppError("Meal not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(meal.mess.id, userId, userRole);

  return meal;
};

// ==================== UPDATE MEAL ====================
const updateMeal = async (
  mealId: string,
  payload: TUpdateMealInput,
  userId: string,
  userRole: string,
) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { id: true, mess: { select: { id: true } } },
  });

  if (!meal) {
    throw new AppError("Meal not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(meal.mess.id, userId, userRole);

  // Recalculate total cost if costPerMeal changes
  let totalCost: number | undefined;
  if (payload.costPerMeal !== undefined) {
    const entryCount = await prisma.mealEntry.count({
      where: { mealId, status: "TAKEN" },
    });
    totalCost = payload.costPerMeal * entryCount;

    // Update all meal entries cost
    await prisma.mealEntry.updateMany({
      where: { mealId, status: "TAKEN" },
      data: { cost: payload.costPerMeal },
    });
  }

  const updatedMeal = await prisma.meal.update({
    where: { id: mealId },
    data: {
      ...payload,
      ...(totalCost !== undefined && { totalCost }),
    },
    select: mealSelect,
  });

  return updatedMeal;
};

// ==================== DELETE MEAL ====================
const deleteMeal = async (mealId: string, userId: string, userRole: string) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { id: true, mess: { select: { id: true } } },
  });

  if (!meal) {
    throw new AppError("Meal not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(meal.mess.id, userId, userRole);

  await prisma.meal.delete({ where: { id: mealId } });

  return { message: "Meal deleted successfully" };
};

// ==================== CREATE MEAL ENTRY ====================
const createMealEntry = async (
  mealId: string,
  payload: TCreateMealEntryInput,
  userId: string,
  userRole: string,
) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: {
      id: true,
      costPerMeal: true,
      totalCost: true,
      mess: { select: { id: true } },
    },
  });

  if (!meal) {
    throw new AppError("Meal not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(meal.mess.id, userId, userRole);

  // Verify member belongs to this mess
  const member = await prisma.member.findUnique({
    where: { id: payload.memberId },
    select: {
      id: true,
      userId: true,
      messId: true,
    },
  });

  if (!member) {
    throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  }

  if (member.messId !== meal.mess.id) {
    throw new AppError(
      "Member does not belong to this mess",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Check if entry already exists
  const existingEntry = await prisma.mealEntry.findFirst({
    where: { mealId, memberId: payload.memberId },
    select: { id: true },
  });

  if (existingEntry) {
    throw new AppError(
      "Meal entry already exists for this member",
      HTTP_STATUS.CONFLICT,
    );
  }

  const cost = payload.status === "TAKEN" ? meal.costPerMeal : 0;

  const entry = await prisma.mealEntry.create({
    data: {
      mealId,
      memberId: payload.memberId,
      userId: member.userId,
      status: payload.status,
      cost,
      note: payload.note,
    },
    select: mealEntrySelect,
  });

  // Update meal total cost
  if (payload.status === "TAKEN") {
    await prisma.meal.update({
      where: { id: mealId },
      data: { totalCost: meal.totalCost + cost },
    });
  }

  return entry;
};

// ==================== BULK CREATE MEAL ENTRIES ====================
const bulkCreateMealEntries = async (
  mealId: string,
  payload: TBulkCreateMealEntryInput,
  userId: string,
  userRole: string,
) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: {
      id: true,
      costPerMeal: true,
      totalCost: true,
      mess: { select: { id: true } },
    },
  });

  if (!meal) {
    throw new AppError("Meal not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(meal.mess.id, userId, userRole);

  // Verify all members belong to this mess
  const members = await prisma.member.findMany({
    where: {
      id: { in: payload.memberIds },
      messId: meal.mess.id,
    },
    select: { id: true, userId: true },
  });

  if (members.length !== payload.memberIds.length) {
    throw new AppError(
      "Some members do not belong to this mess",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Filter out members who already have an entry
  const existingEntries = await prisma.mealEntry.findMany({
    where: {
      mealId,
      memberId: { in: payload.memberIds },
    },
    select: { memberId: true },
  });

  const existingMemberIds = new Set(existingEntries.map((e) => e.memberId));
  const newMembers = members.filter((m) => !existingMemberIds.has(m.id));

  if (newMembers.length === 0) {
    throw new AppError(
      "All selected members already have meal entries",
      HTTP_STATUS.CONFLICT,
    );
  }

  const cost = payload.status === "TAKEN" ? meal.costPerMeal : 0;

  // Bulk create entries
  await prisma.mealEntry.createMany({
    data: newMembers.map((member) => ({
      mealId,
      memberId: member.id,
      userId: member.userId,
      status: payload.status,
      cost,
    })),
  });

  // Update meal total cost
  if (payload.status === "TAKEN") {
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        totalCost: meal.totalCost + cost * newMembers.length,
      },
    });
  }

  return {
    message: `${newMembers.length} meal entries created successfully`,
    created: newMembers.length,
    skipped: existingMemberIds.size,
  };
};

// ==================== GET MEAL ENTRIES ====================
const getMealEntries = async (
  mealId: string,
  userId: string,
  userRole: string,
) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { id: true, mess: { select: { id: true } } },
  });

  if (!meal) {
    throw new AppError("Meal not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(meal.mess.id, userId, userRole);

  const entries = await prisma.mealEntry.findMany({
    where: { mealId },
    select: mealEntrySelect,
    orderBy: { createdAt: "asc" },
  });

  return entries;
};

// ==================== UPDATE MEAL ENTRY ====================
const updateMealEntry = async (
  entryId: string,
  payload: TUpdateMealEntryInput,
  userId: string,
  userRole: string,
) => {
  const entry = await prisma.mealEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      status: true,
      cost: true,
      meal: {
        select: {
          id: true,
          costPerMeal: true,
          totalCost: true,
          mess: { select: { id: true } },
        },
      },
    },
  });

  if (!entry) {
    throw new AppError("Meal entry not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(entry.meal.mess.id, userId, userRole);

  const newCost = payload.status === "TAKEN" ? entry.meal.costPerMeal : 0;
  const costDiff = newCost - entry.cost;

  const updatedEntry = await prisma.mealEntry.update({
    where: { id: entryId },
    data: {
      status: payload.status,
      cost: newCost,
      note: payload.note,
    },
    select: mealEntrySelect,
  });

  // Update meal total cost
  if (costDiff !== 0) {
    await prisma.meal.update({
      where: { id: entry.meal.id },
      data: { totalCost: entry.meal.totalCost + costDiff },
    });
  }

  return updatedEntry;
};

// ==================== DELETE MEAL ENTRY ====================
const deleteMealEntry = async (
  entryId: string,
  userId: string,
  userRole: string,
) => {
  const entry = await prisma.mealEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      cost: true,
      meal: {
        select: {
          id: true,
          totalCost: true,
          mess: { select: { id: true } },
        },
      },
    },
  });

  if (!entry) {
    throw new AppError("Meal entry not found", HTTP_STATUS.NOT_FOUND);
  }

  await verifyMessAccess(entry.meal.mess.id, userId, userRole);

  await prisma.mealEntry.delete({ where: { id: entryId } });

  // Update meal total cost
  await prisma.meal.update({
    where: { id: entry.meal.id },
    data: { totalCost: entry.meal.totalCost - entry.cost },
  });

  return { message: "Meal entry deleted successfully" };
};

// ==================== GET MEAL SUMMARY ====================
const getMealSummary = async (
  messId: string,
  userId: string,
  userRole: string,
) => {
  await verifyMessAccess(messId, userId, userRole);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [totalMeals, totalEntries, monthlyCost, mealsByType, dailyMeals] =
    await Promise.all([
      prisma.meal.count({ where: { messId } }),

      prisma.mealEntry.count({
        where: { meal: { messId }, status: "TAKEN" },
      }),

      prisma.mealEntry.aggregate({
        where: {
          meal: {
            messId,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          status: "TAKEN",
        },
        _sum: { cost: true },
      }),

      prisma.meal.groupBy({
        by: ["mealType"],
        where: { messId },
        _count: { mealType: true },
        _sum: { totalCost: true },
      }),

      prisma.meal.findMany({
        where: {
          messId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          id: true,
          mealType: true,
          date: true,
          costPerMeal: true,
          totalCost: true,
          _count: { select: { mealEntries: true } },
        },
        orderBy: { date: "asc" },
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
    totalEntries,
    monthlyStats: {
      month: today.toLocaleString("default", { month: "long" }),
      year: today.getFullYear(),
      totalCost: monthlyCost._sum.cost || 0,
      dailyMeals,
    },
    mealsByType: mealTypeStats,
  };
};

export const MealService = {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  createMealEntry,
  bulkCreateMealEntries,
  getMealEntries,
  updateMealEntry,
  deleteMealEntry,
  getMealSummary,
};
