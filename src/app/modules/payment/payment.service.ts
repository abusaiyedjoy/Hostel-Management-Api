import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { NotificationService } from "../notification/notification.service";
import { emitToUser } from "../../utils/socket";
import {
  bkashCreatePayment,
  bkashExecutePayment,
  bkashQueryPayment,
  bkashRefundPayment,
} from "../../utils/bkash";
import type {
  TInitiatePaymentInput,
  TGetPaymentsQuery,
  TRefundPaymentInput,
} from "./payment.validation";

const paymentSelect = {
  id: true,
  amount: true,
  currency: true,
  status: true,
  provider: true,
  bkashPaymentId: true,
  bkashTrxId: true,
  failureReason: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: {
      id: true,
      registrationNo: true,
      totalBalance: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

// ─── Generate unique invoice number ───────────────
const generateInvoiceNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HM-${timestamp}-${random}`;
};

// ==================== INITIATE PAYMENT ====================
const initiatePayment = async (
  payload: TInitiatePaymentInput,
  userId: string,
) => {
  // Verify member exists and belongs to user (or admin is doing it)
  const member = await prisma.member.findUnique({
    where: { id: payload.memberId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      mess: { select: { id: true, name: true } },
    },
  });

  if (!member) {
    throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  }

  if (!member.isActive) {
    throw new AppError("Member account is inactive", HTTP_STATUS.BAD_REQUEST);
  }

  if (member.userId !== userId) {
    throw new AppError(
      "You can only deposit to your own account",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const invoiceNumber = generateInvoiceNumber();

  // Create PENDING payment record first
  const payment = await prisma.payment.create({
    data: {
      amount: payload.amount,
      status: "PENDING",
      provider: "BKASH",
      memberId: payload.memberId,
      userId,
    },
    select: { id: true, amount: true },
  });

  try {
    // Call bKash createPayment
    const bkashResponse = await bkashCreatePayment({
      amount: payload.amount.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: invoiceNumber,
    });

    if (bkashResponse.statusCode !== "0000") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: bkashResponse.statusMessage,
        },
      });
      throw new AppError(
        bkashResponse.statusMessage || "bKash payment initiation failed",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Store bKash paymentID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { bkashPaymentId: bkashResponse.paymentID },
    });

    return {
      paymentId: payment.id,
      bkashPaymentId: bkashResponse.paymentID,
      bkashURL: bkashResponse.bkashURL,
      amount: payload.amount,
      currency: "BDT",
    };
  } catch (error) {
    // If bKash call failed, mark payment as failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "bKash API error" },
    });
    throw error;
  }
};

// ==================== CALLBACK (called by bKash) ====================
const handleCallback = async (query: {
  paymentID?: string;
  status?: string;
}) => {
  const { paymentID, status } = query;

  if (!paymentID) {
    return { success: false, message: "Missing paymentID" };
  }

  // User cancelled
  if (status === "cancel") {
    await prisma.payment.updateMany({
      where: { bkashPaymentId: paymentID },
      data: { status: "CANCELLED", failureReason: "User cancelled payment" },
    });
    return { success: false, message: "Payment cancelled" };
  }

  // User failed
  if (status === "failure") {
    await prisma.payment.updateMany({
      where: { bkashPaymentId: paymentID },
      data: { status: "FAILED", failureReason: "Payment failed on bKash" },
    });
    return { success: false, message: "Payment failed" };
  }

  try {
    // Execute payment on bKash
    const executeResponse = await bkashExecutePayment(paymentID);

    const payment = await prisma.payment.findFirst({
      where: { bkashPaymentId: paymentID },
      select: {
        id: true,
        amount: true,
        memberId: true,
        userId: true,
        status: true,
      },
    });

    if (!payment) {
      return { success: false, message: "Payment record not found" };
    }

    // Prevent double processing
    if (payment.status !== "PENDING") {
      return { success: true, message: "Payment already processed" };
    }

    if (
      executeResponse.statusCode === "0000" &&
      executeResponse.transactionStatus === "Completed"
    ) {
      // Update payment + member balance in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            bkashTrxId: executeResponse.trxID,
            callbackData: executeResponse,
          },
        });

        await tx.member.update({
          where: { id: payment.memberId },
          data: { totalBalance: { increment: payment.amount } },
        });
      });

      // Send real-time notification
      await NotificationService.create({
        userId: payment.userId,
        title: "Deposit successful",
        message: `Your bKash deposit of ৳${payment.amount} was successful. Transaction ID: ${executeResponse.trxID}`,
        type: "BALANCE",
        relatedId: payment.id,
        relatedType: "PAYMENT",
      });

      try {
        emitToUser(payment.userId, "payment:success", {
          paymentId: payment.id,
          amount: payment.amount,
          trxID: executeResponse.trxID,
        });
      } catch {
        // Socket may not be initialized
      }

      return {
        success: true,
        message: "Payment successful",
        trxID: executeResponse.trxID,
      };
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: executeResponse.statusMessage,
          callbackData: executeResponse,
        },
      });

      await NotificationService.create({
        userId: payment.userId,
        title: "Deposit failed",
        message: `Your bKash deposit of ৳${payment.amount} failed. Reason: ${executeResponse.statusMessage}`,
        type: "BALANCE",
        relatedId: payment.id,
        relatedType: "PAYMENT",
      });

      return { success: false, message: executeResponse.statusMessage };
    }
  } catch {
    return { success: false, message: "Payment execution failed" };
  }
};

// ==================== GET MY PAYMENTS ====================
const getMyPayments = async (userId: string, query: TGetPaymentsQuery) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (query.status) where.status = query.status;
  if (query.memberId) where.memberId = query.memberId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ==================== GET ALL PAYMENTS (Admin) ====================
const getAllPayments = async (query: TGetPaymentsQuery) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.status) where.status = query.status;
  if (query.memberId) where.memberId = query.memberId;

  const [payments, total, stats] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { amount: true },
    }),
  ]);

  const paymentStats = stats.reduce(
    (acc, curr) => {
      acc[curr.status] = {
        count: curr._count.status,
        totalAmount: curr._sum.amount || 0,
      };
      return acc;
    },
    {} as Record<string, { count: number; totalAmount: number }>,
  );

  return {
    payments,
    stats: paymentStats,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ==================== GET PAYMENT BY ID ====================
const getPaymentById = async (
  paymentId: string,
  userId: string,
  userRole: string,
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      ...paymentSelect,
      callbackData: true,
      bkashToken: true,
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  }

  if (userRole !== "ADMIN" && payment.member.user.id !== userId) {
    throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);
  }

  return payment;
};

// ==================== QUERY PAYMENT STATUS ====================
const queryPaymentStatus = async (paymentId: string, userId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      bkashPaymentId: true,
      userId: true,
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  }

  if (payment.userId !== userId) {
    throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);
  }

  if (!payment.bkashPaymentId) {
    return { status: payment.status };
  }

  // Query bKash for latest status
  const bkashStatus = await bkashQueryPayment(payment.bkashPaymentId);

  return {
    status: payment.status,
    bkashStatus: bkashStatus.transactionStatus,
    bkashStatusCode: bkashStatus.statusCode,
  };
};

// ==================== REFUND PAYMENT (Admin) ====================
const refundPayment = async (
  paymentId: string,
  payload: TRefundPaymentInput,
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      status: true,
      bkashPaymentId: true,
      bkashTrxId: true,
      memberId: true,
      userId: true,
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  }

  if (payment.status !== "SUCCESS") {
    throw new AppError(
      "Only successful payments can be refunded",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  if (!payment.bkashPaymentId || !payment.bkashTrxId) {
    throw new AppError(
      "Missing bKash transaction data",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const refundResponse = await bkashRefundPayment({
    paymentID: payment.bkashPaymentId,
    trxID: payment.bkashTrxId,
    amount: payment.amount.toString(),
    reason: payload.reason,
    sku: payment.id,
  });

  if (refundResponse.statusCode !== "0000") {
    throw new AppError(
      refundResponse.statusMessage || "Refund failed",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Update payment + deduct balance in transaction
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });

    await tx.member.update({
      where: { id: payment.memberId },
      data: { totalBalance: { decrement: payment.amount } },
    });
  });

  await NotificationService.create({
    userId: payment.userId,
    title: "Payment refunded",
    message: `Your payment of ৳${payment.amount} has been refunded.`,
    type: "BALANCE",
    relatedId: paymentId,
    relatedType: "PAYMENT",
  });

  return { message: "Payment refunded successfully" };
};

export const PaymentService = {
  initiatePayment,
  handleCallback,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  queryPaymentStatus,
  refundPayment,
};
