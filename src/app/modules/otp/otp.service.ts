import crypto from "crypto";
import { redis } from "../../config/redis";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { sendOtpEmail } from "../../utils/email";
import { sendOtpSms } from "../../utils/sms";
import { env } from "../../config/env";

// ─── OTP purpose types ─────────────────────────────
export type TOtpPurpose = "VERIFY_EMAIL" | "FORGOT_PASSWORD" | "VERIFY_PHONE";

export type TOtpChannel = "EMAIL" | "PHONE";

// ─── Redis key helpers ─────────────────────────────
const otpKey = (purpose: TOtpPurpose, identifier: string) =>
  `otp:${purpose}:${identifier.toLowerCase().trim()}`;

const attemptsKey = (purpose: TOtpPurpose, identifier: string) =>
  `otp:attempts:${purpose}:${identifier.toLowerCase().trim()}`;

const cooldownKey = (purpose: TOtpPurpose, identifier: string) =>
  `otp:cooldown:${purpose}:${identifier.toLowerCase().trim()}`;

// ─── Generate 6-digit OTP ─────────────────────────
const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// ==================== SEND OTP ====================
export const sendOtp = async (payload: {
  identifier: string;
  purpose: TOtpPurpose;
  channel: TOtpChannel;
  userId?: string;
}): Promise<{ message: string; expiresInSeconds: number }> => {
  const { identifier, purpose, channel } = payload;
  const key = otpKey(purpose, identifier);
  const cooldown = cooldownKey(purpose, identifier);

  // ── Rate limit: cooldown between sends ────────
  const isCoolingDown = await redis.exists(cooldown);
  if (isCoolingDown) {
    const ttl = await redis.ttl(cooldown);
    throw new AppError(
      `Please wait ${ttl} seconds before requesting a new OTP`,
      HTTP_STATUS.TOO_MANY_REQUESTS,
    );
  }

  // ── Validate identifier exists in DB ──────────
  if (channel === "EMAIL") {
    const user = await prisma.user.findUnique({
      where: { email: identifier.toLowerCase().trim() },
      select: { id: true, isActive: true },
    });
    if (!user) throw new AppError("Email not found", HTTP_STATUS.NOT_FOUND);
    if (!user.isActive)
      throw new AppError("Account is inactive", HTTP_STATUS.FORBIDDEN);
  }

  if (channel === "PHONE") {
    const user = await prisma.user.findFirst({
      where: { phone: identifier.trim() },
      select: { id: true, isActive: true },
    });
    if (!user)
      throw new AppError("Phone number not found", HTTP_STATUS.NOT_FOUND);
    if (!user.isActive)
      throw new AppError("Account is inactive", HTTP_STATUS.FORBIDDEN);
  }

  // ── Generate and store OTP ────────────────────
  const otp = generateOtp();
  const otpData = JSON.stringify({
    otp,
    purpose,
    channel,
    identifier: identifier.toLowerCase().trim(),
    createdAt: Date.now(),
    attempts: 0,
  });

  await redis.set(key, otpData, "EX", env.OTP.EXPIRES_IN);

  // ── Set cooldown ──────────────────────────────
  await redis.set(cooldown, "1", "EX", env.OTP.RESEND_COOLDOWN);

  // ── Reset attempt counter ─────────────────────
  await redis.del(attemptsKey(purpose, identifier));

  // ── Send via channel ──────────────────────────
  try {
    if (channel === "EMAIL") {
      await sendOtpEmail(identifier, otp, purpose);
    } else {
      await sendOtpSms(identifier, otp, purpose);
    }
  } catch (err) {
    await redis.del(key);
    await redis.del(cooldown);
    throw new AppError(
      `Failed to send OTP via ${channel.toLowerCase()}. Please try again.`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }

  return {
    message: `OTP sent to your ${channel === "EMAIL" ? "email" : "phone number"}`,
    expiresInSeconds: env.OTP.EXPIRES_IN,
  };
};

// ==================== VERIFY OTP ====================
export const verifyOtp = async (payload: {
  identifier: string;
  otp: string;
  purpose: TOtpPurpose;
  channel: TOtpChannel;
}): Promise<{
  id: string;
  email: string;
  role: any;
}> => {
  const { identifier, otp, purpose, channel } = payload;
  const key = otpKey(purpose, identifier);
  const attempts = attemptsKey(purpose, identifier);

  // ── Check attempt count ────────────────────────
  const attemptCount = parseInt((await redis.get(attempts)) || "0");
  if (attemptCount >= env.OTP.MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(
      "Too many failed attempts. Please request a new OTP.",
      HTTP_STATUS.TOO_MANY_REQUESTS,
    );
  }

  // ── Get stored OTP ─────────────────────────────
  const stored = await redis.get(key);
  if (!stored) {
    throw new AppError(
      "OTP expired or not found. Please request a new one.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const data = JSON.parse(stored);

  // ── Compare ────────────────────────────────────
  if (data.otp !== otp.trim()) {
    await redis.incr(attempts);
    await redis.expire(attempts, env.OTP.EXPIRES_IN);

    const remaining = env.OTP.MAX_ATTEMPTS - (attemptCount + 1);
    throw new AppError(
      `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // ── OTP is valid — delete it ───────────────────
  await redis.del(key);
  await redis.del(attempts);
  await redis.del(cooldownKey(purpose, identifier));

  // ── Fetch user ─────────────────────────────────
  let user;
  if (channel === "EMAIL") {
    user = await prisma.user.findUnique({
      where: { email: identifier.toLowerCase().trim() },
      select: { id: true, email: true, role: true },
    });
  } else {
    user = await prisma.user.findFirst({
      where: { phone: identifier.trim() },
      select: { id: true, email: true, role: true },
    });
  }

  if (!user) throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};

// ==================== CHECK COOLDOWN ====================
export const getOtpStatus = async (
  identifier: string,
  purpose: TOtpPurpose,
): Promise<{
  canResend: boolean;
  cooldownSeconds: number;
  otpExists: boolean;
}> => {
  const cooldown = cooldownKey(purpose, identifier);
  const key = otpKey(purpose, identifier);

  const [cooldownTtl, otpExists] = await Promise.all([
    redis.ttl(cooldown),
    redis.exists(key),
  ]);

  return {
    canResend: cooldownTtl <= 0,
    cooldownSeconds: Math.max(0, cooldownTtl),
    otpExists: otpExists === 1,
  };
};

// ==================== INVALIDATE OTP ====================
export const invalidateOtp = async (
  identifier: string,
  purpose: TOtpPurpose,
): Promise<void> => {
  const key = otpKey(purpose, identifier);
  const attempts = attemptsKey(purpose, identifier);
  const cooldown = cooldownKey(purpose, identifier);
  await redis.del(key, attempts, cooldown);
};
