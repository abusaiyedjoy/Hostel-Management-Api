import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { JwtUtils } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import type {
  TResetPasswordInput,
  TForgotPasswordInput,
  TVerifyAccountInput,
  TRegisterInput,
  TLoginInput,
  TChangePasswordInput,
  TUpdateProfileInput,
} from "./auth.validation";
import { NotificationService } from "../notification/notification.service";
import { sendOtp, verifyOtp } from "../otp/otp.service";

// Selected fields reused across queries
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

const register = async (payload: TRegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError("Email already registered", HTTP_STATUS.CONFLICT);
  }

  const passwordHashed = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: passwordHashed,
      phone: payload.phone,
      role: "MEMBER",
    },
    select: safeUserSelect,
  });

  await NotificationService.create({
    userId: user.id,
    title: "Welcome to Hostel Hub!",
    message: `Hi ${user.name}, your account has been created successfully.`,
    type: "SYSTEM",
  });

  const accessToken = JwtUtils.generate({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, accessToken };
};

const login = async (payload: TLoginInput) => {
  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      ...safeUserSelect,
      password: true,
      member: {
        select: {
          id: true,
          registrationNo: true,
          totalBalance: true,
          mess: { select: { id: true, name: true, city: true } },
        },
      },
      mealManager: {
        select: {
          id: true,
          mess: { select: { id: true, name: true } },
        },
      },
      messManager: {
        select: { id: true, name: true, city: true },
      },
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
  }

  if (!user.isActive) {
    throw new AppError(
      "Your account has been deactivated. Contact admin.",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
  }

  const accessToken = JwtUtils.generate({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // Remove password from response
  const { password: _password, ...safeUser } = user;

  return { user: safeUser, accessToken };
};

const getMe = async (userId: string) => {
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
            select: {
              id: true,
              name: true,
              city: true,
              ratePerMeal: true,
            },
          },
        },
      },
      mealManager: {
        select: {
          id: true,
          mess: { select: { id: true, name: true, city: true } },
        },
      },
      messManager: {
        select: {
          id: true,
          name: true,
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

const changePassword = async (
  userId: string,
  payload: TChangePasswordInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  const isOldPasswordValid = await bcrypt.compare(
    payload.oldPassword,
    user.password,
  );

  if (!isOldPasswordValid) {
    throw new AppError(
      "Current password is incorrect",
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  const newPasswordHashed = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: newPasswordHashed },
  });

  return { message: "Password changed successfully" };
};

const updateProfile = async (userId: string, payload: TUpdateProfileInput) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name && { name: payload.name }),
      ...(payload.phone && { phone: payload.phone }),
      ...(payload.image && { image: payload.image }),
    },
    select: safeUserSelect,
  });

  return user;
};

const sendVerifyAccountOtp = async (payload: TForgotPasswordInput) => {
  return sendOtp({
    identifier: payload.identifier,
    purpose: "VERIFY_EMAIL",
    channel: payload.channel,
  });
};

// ==================== VERIFY ACCOUNT ====================
const verifyAccount = async (payload: TVerifyAccountInput) => {
  const user = await verifyOtp({
    identifier: payload.identifier,
    otp: payload.otp,
    purpose: "VERIFY_EMAIL",
    channel: payload.channel,
  });

  // Mark user as verified
  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  const accessToken = JwtUtils.generate({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { message: "Account verified successfully", accessToken };
};

// ==================== FORGOT PASSWORD — SEND OTP ====================
const forgotPassword = async (payload: TForgotPasswordInput) => {
  return sendOtp({
    identifier: payload.identifier,
    purpose: "FORGOT_PASSWORD",
    channel: payload.channel,
  });
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (payload: TResetPasswordInput) => {
  // Verify OTP first
  const user = await verifyOtp({
    identifier: payload.identifier,
    otp: payload.otp,
    purpose: "FORGOT_PASSWORD",
    channel: payload.channel,
  });

  const hashedPassword = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successfully" };
};

// Add to AuthService export:
export const AuthService = {
  register,
  login,
  getMe,
  changePassword,
  updateProfile,
  sendVerifyAccountOtp, // ← new
  verifyAccount, // ← new
  forgotPassword, // ← new
  resetPassword, // ← new
};
