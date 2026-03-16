import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { NotificationService } from "../notification/notification.service";
import type {
  TAddMemberInput,
  TUpdateMemberInput,
  TGetMembersQuery,
} from "./member.validation";

// Reusable member select
const memberSelect = {
  id: true,
  registrationNo: true,
  dateOfJoining: true,
  totalBalance: true,
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

// ==================== ADD MEMBER ====================
const addMember = async (
  payload: TAddMemberInput,
  requesterId: string,
  requesterRole: string,
) => {
  // Verify mess exists
  const mess = await prisma.mess.findUnique({
    where: { id: payload.messId },
    select: { id: true, managerId: true, capacity: true },
  });

  if (!mess) {
    throw new AppError("Mess not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only add members to their own mess
  if (requesterRole === "MESS_MANAGER" && mess.managerId !== requesterId) {
    throw new AppError(
      "You can only add members to your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  // Check mess capacity
  const currentMemberCount = await prisma.member.count({
    where: { messId: payload.messId, isActive: true },
  });

  if (currentMemberCount >= mess.capacity) {
    throw new AppError(
      `Mess is at full capacity (${mess.capacity} members)`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, member: { select: { id: true } } },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  // Check if user is already a member of any mess
  if (user.member) {
    throw new AppError(
      "This user is already a member of a mess",
      HTTP_STATUS.CONFLICT,
    );
  }

  // Check if registration number is unique
  const existingRegNo = await prisma.member.findUnique({
    where: { registrationNo: payload.registrationNo },
    select: { id: true },
  });

  if (existingRegNo) {
    throw new AppError(
      "Registration number already exists",
      HTTP_STATUS.CONFLICT,
    );
  }

  // Update user role to MEMBER if not already
  if (user.role !== "MEMBER") {
    await prisma.user.update({
      where: { id: payload.userId },
      data: { role: "MEMBER" },
    });
  }

  const member = await prisma.member.create({
    data: {
      userId: payload.userId,
      messId: payload.messId,
      registrationNo: payload.registrationNo,
      dateOfJoining: payload.dateOfJoining,
      totalBalance: payload.totalBalance,
    },
    select: memberSelect,
  });

  await NotificationService.create({
    userId: payload.userId,
    title: "Welcome to the mess!",
    message: `You have been added as a member of the mess. Your registration number is ${member.registrationNo}.`,
    type: "MEMBER",
    messId: payload.messId,
    relatedId: member.id,
    relatedType: "MEMBER",
  });

  return member;
};

// ==================== GET ALL MEMBERS ====================
const getAllMembers = async (
  messId: string,
  query: TGetMembersQuery,
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

  // Mess manager can only view members of their own mess
  if (requesterRole === "MESS_MANAGER" && mess.managerId !== requesterId) {
    throw new AppError(
      "You can only view members of your own mess",
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
    where.OR = [
      { registrationNo: { contains: query.search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      select: memberSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.count({ where }),
  ]);

  return {
    members,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==================== GET MEMBER BY ID ====================
const getMemberById = async (
  memberId: string,
  requesterId: string,
  requesterRole: string,
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      ...memberSelect,
      mealEntries: {
        select: {
          id: true,
          status: true,
          cost: true,
          createdAt: true,
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
  });

  if (!member) {
    throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  }

  // Members can only view their own data
  if (requesterRole === "MEMBER" && member.user.id !== requesterId) {
    throw new AppError(
      "You can only view your own profile",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  return member;
};

// ==================== GET MY MEMBER PROFILE ====================
const getMyMemberProfile = async (userId: string) => {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: {
      ...memberSelect,
      mealEntries: {
        select: {
          id: true,
          status: true,
          cost: true,
          createdAt: true,
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
        take: 20,
      },
    },
  });

  if (!member) {
    throw new AppError(
      "You are not a member of any mess",
      HTTP_STATUS.NOT_FOUND,
    );
  }

  return member;
};

// ==================== GET MEMBER MEAL SUMMARY ====================
const getMemberMealSummary = async (
  memberId: string,
  requesterId: string,
  requesterRole: string,
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      totalBalance: true,
      user: { select: { id: true, name: true } },
      mess: { select: { ratePerMeal: true } },
    },
  });

  if (!member) {
    throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  }

  // Members can only view their own summary
  if (requesterRole === "MEMBER" && member.user.id !== requesterId) {
    throw new AppError(
      "You can only view your own meal summary",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const [totalMeals, takenMeals, cancelledMeals, totalCost] = await Promise.all(
    [
      prisma.mealEntry.count({ where: { memberId } }),
      prisma.mealEntry.count({
        where: { memberId, status: "TAKEN" },
      }),
      prisma.mealEntry.count({
        where: { memberId, status: "CANCELLED" },
      }),
      prisma.mealEntry.aggregate({
        where: { memberId, status: "TAKEN" },
        _sum: { cost: true },
      }),
    ],
  );

  // Monthly breakdown
  const monthlyBreakdown = await prisma.mealEntry.groupBy({
    by: ["createdAt"],
    where: { memberId, status: "TAKEN" },
    _sum: { cost: true },
    _count: { id: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    memberId,
    memberName: member.user.name,
    totalBalance: member.totalBalance,
    ratePerMeal: member.mess.ratePerMeal,
    summary: {
      totalMeals,
      takenMeals,
      cancelledMeals,
      notTakenMeals: totalMeals - takenMeals - cancelledMeals,
      totalCost: totalCost._sum.cost || 0,
    },
    monthlyBreakdown,
  };
};

// ==================== UPDATE MEMBER ====================
const updateMember = async (
  memberId: string,
  payload: TUpdateMemberInput,
  requesterId: string,
  requesterRole: string,
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      mess: { select: { managerId: true } },
    },
  });

  if (!member) {
    throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only update members of their own mess
  if (
    requesterRole === "MESS_MANAGER" &&
    member.mess.managerId !== requesterId
  ) {
    throw new AppError(
      "You can only update members of your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: payload,
    select: memberSelect,
  });

  if (payload.totalBalance !== undefined) {
    await NotificationService.create({
      userId: updatedMember.user.id,
      title: "Balance updated",
      message: `Your meal balance has been updated to ${payload.totalBalance}.`,
      type: "BALANCE",
      messId: updatedMember.mess.id,
      relatedId: updatedMember.id,
      relatedType: "MEMBER",
    });
  }

  return updatedMember;
};

// ==================== REMOVE MEMBER ====================
const removeMember = async (
  memberId: string,
  requesterId: string,
  requesterRole: string,
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      mess: { select: { managerId: true } },
    },
  });

  if (!member) {
    throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  }

  // Mess manager can only remove members from their own mess
  if (
    requesterRole === "MESS_MANAGER" &&
    member.mess.managerId !== requesterId
  ) {
    throw new AppError(
      "You can only remove members from your own mess",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  await NotificationService.create({
    userId: member.id,
    title: "Removed from mess",
    message: "You have been removed from the mess.",
    type: "MEMBER",
  });

  await prisma.member.delete({ where: { id: memberId } });

  return { message: "Member removed successfully" };
};

export const MemberService = {
  addMember,
  getAllMembers,
  getMemberById,
  getMyMemberProfile,
  getMemberMealSummary,
  updateMember,
  removeMember,
};
