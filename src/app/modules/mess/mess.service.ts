import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import type {
  TCreateMessInput,
  TUpdateMessInput,
  TGetMessQuery,
} from "./mess.validation";

// Reusable mess select fields
const messSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  capacity: true,
  ratePerMeal: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} as const;

// ==================== CREATE MESS ====================
const createMess = async (payload: TCreateMessInput) => {
  // Check if mess email already exists
  const existingMess = await prisma.mess.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });

  if (existingMess) {
    throw new AppError(
      "Mess with this email already exists",
      HTTP_STATUS.CONFLICT,
    );
  }

  // Check if manager exists and has MESS_MANAGER role
  const manager = await prisma.user.findUnique({
    where: { id: payload.managerId },
    select: { id: true, role: true, messManager: { select: { id: true } } },
  });

  if (!manager) {
    throw new AppError("Manager not found", HTTP_STATUS.NOT_FOUND);
  }

  if (manager.role !== "MESS_MANAGER") {
    throw new AppError(
      "Assigned user must have MESS_MANAGER role",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Check if manager is already managing another mess
  if (manager.messManager) {
    throw new AppError(
      "This manager is already managing another mess",
      HTTP_STATUS.CONFLICT,
    );
  }

  const mess = await prisma.mess.create({
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      capacity: payload.capacity,
      ratePerMeal: payload.ratePerMeal,
      managerId: payload.managerId,
    },
    select: messSelect,
  });

  return mess;
};

// ==================== GET ALL MESS ====================
const getAllMess = async (query: TGetMessQuery) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { city: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.city) {
    where.city = { contains: query.city, mode: "insensitive" };
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const [messList, total] = await Promise.all([
    prisma.mess.findMany({
      where,
      select: {
        ...messSelect,
        _count: {
          select: {
            members: true,
            mealManagers: true,
            meals: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.mess.count({ where }),
  ]);

  return {
    mess: messList,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==================== GET MESS BY ID ====================
const getMessById = async (messId: string) => {
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: {
      ...messSelect,
      members: {
        select: {
          id: true,
          registrationNo: true,
          dateOfJoining: true,
          totalBalance: true,
          isActive: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      mealManagers: {
        select: {
          id: true,
          isActive: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          mealManagers: true,
          meals: true,
        },
      },
    },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  return mess;
};

// ==================== GET MY MESS (Mess Manager) ====================
const getMyMess = async (userId: string) => {
  const mess = await prisma.mess.findUnique({
    where: { managerId: userId },
    select: {
      ...messSelect,
      members: {
        select: {
          id: true,
          registrationNo: true,
          dateOfJoining: true,
          totalBalance: true,
          isActive: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      mealManagers: {
        select: {
          id: true,
          isActive: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          mealManagers: true,
          meals: true,
        },
      },
    },
  });

  if (!mess) {
    throw new AppError("You are not managing any mess", HTTP_STATUS.NOT_FOUND);
  }

  return mess;
};

// ==================== UPDATE MESS ====================
const updateMess = async (
  messId: string,
  payload: TUpdateMessInput,
  userId: string,
  userRole: string,
) => {
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { id: true, managerId: true },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only update their own mess
  if (userRole === "MESS_MANAGER" && mess.managerId !== userId) {
    throw new AppError(
      "You are not authorized to update this mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const updatedMess = await prisma.mess.update({
    where: { id: messId },
    data: payload,
    select: messSelect,
  });

  return updatedMess;
};

// ==================== DELETE MESS ====================
const deleteMess = async (messId: string) => {
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { id: true },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  await prisma.mess.delete({ where: { id: messId } });

  return { message: "Mess deleted successfully" };
};

// ==================== MESS STATS ====================
const getMessStats = async (messId: string) => {
  const [totalMembers, totalMeals, totalMealEntries, recentMeals] =
    await Promise.all([
      prisma.member.count({ where: { messId } }),
      prisma.meal.count({ where: { messId } }),
      prisma.mealEntry.count({
        where: { meal: { messId } },
      }),
      prisma.meal.findMany({
        where: { messId },
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

  return {
    totalMembers,
    totalMeals,
    totalMealEntries,
    recentMeals,
  };
};

export const MessService = {
  createMess,
  getAllMess,
  getMessById,
  getMyMess,
  updateMess,
  deleteMess,
  getMessStats,
};
