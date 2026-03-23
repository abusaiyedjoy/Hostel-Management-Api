import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { NotificationService } from "../notification/notification.service";
import { emitToUser } from "../../utils/socket";
import {
  bkashCreatePayment,
  bkashExecutePayment,
  // bkashQueryPayment,
  bkashRefundPayment,
} from "../../utils/bkash";
import {
  stripeCreateSession,
  stripeVerifyWebhook,
  stripeGetSession,
  stripeRefund,
} from "../../utils/stripe";
import {
  sslInitPayment,
  sslValidateIPN,
  sslRefund,
} from "../../utils/sslcommerz";
import type {
  TInitiatePaymentInput,
  TGetPaymentsQuery,
  TRefundPaymentInput,
} from "./payment.validation";
import type { Request } from "express";

// ─── Shared select ─────────────────────────────────
const paymentSelect = {
  id: true,
  amount: true,
  currency: true,
  status: true,
  provider: true,
  invoiceNumber: true,
  bkashPaymentId: true,
  bkashTrxId: true,
  stripeSessionId: true,
  stripePaymentIntentId: true,
  sslTranId: true,
  sslValId: true,
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

// ─── Helpers ───────────────────────────────────────
const generateInvoiceNumber = (): string => {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HM-${ts}-${rnd}`;
};

const notifyAndEmit = async (
  userId: string,
  paymentId: string,
  amount: number,
  trxRef: string,
  success: boolean,
  provider: string
) => {
  const title = success ? "Deposit successful" : "Deposit failed";
  const message = success
    ? `Your ${provider} deposit of ৳${amount} was successful. Ref: ${trxRef}`
    : `Your ${provider} deposit of ৳${amount} failed. Ref: ${trxRef}`;

  await NotificationService.create({
    userId,
    title,
    message,
    type: "BALANCE",
    relatedId: paymentId,
    relatedType: "PAYMENT",
  });

  try {
    emitToUser(
      userId,
      success ? "payment:success" : "payment:failed",
      { paymentId, amount, trxRef, provider }
    );
  } catch {
    // socket may not be initialized
  }
};

const applyBalanceUpdate = async (
  memberId: string,
  amount: number,
  increment: boolean
) => {
  await prisma.member.update({
    where: { id: memberId },
    data: {
      totalBalance: increment
        ? { increment: amount }
        : { decrement: amount },
    },
  });
};

// ==================== INITIATE ====================
const initiatePayment = async (
  payload: TInitiatePaymentInput,
  userId: string
) => {
  const member = await prisma.member.findUnique({
    where: { id: payload.memberId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      user: { select: { name: true, email: true, phone: true } },
      mess: { select: { address: true } },
    },
  });

  if (!member) throw new AppError("Member not found", HTTP_STATUS.NOT_FOUND);
  if (!member.isActive) throw new AppError("Member account is inactive", HTTP_STATUS.BAD_REQUEST);
  if (member.userId !== userId)
    throw new AppError("You can only deposit to your own account", HTTP_STATUS.FORBIDDEN);

  const invoiceNumber = generateInvoiceNumber();

  const payment = await prisma.payment.create({
    data: {
      amount: payload.amount,
      currency: payload.currency || "BDT",
      status: "PENDING",
      provider: payload.provider,
      invoiceNumber,
      memberId: payload.memberId,
      userId,
    },
    select: { id: true, amount: true, currency: true },
  });

  try {
    // ── bKash ──────────────────────────────────
    if (payload.provider === "BKASH") {
      const bkashRes = await bkashCreatePayment({
        amount: payload.amount.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoiceNumber,
      });

      if (bkashRes.statusCode !== "0000") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", failureReason: bkashRes.statusMessage },
        });
        throw new AppError(bkashRes.statusMessage || "bKash initiation failed", HTTP_STATUS.BAD_REQUEST);
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { bkashPaymentId: bkashRes.paymentID },
      });

      return {
        paymentId: payment.id,
        provider: "BKASH",
        redirectUrl: bkashRes.bkashURL,
        bkashPaymentId: bkashRes.paymentID,
        amount: payment.amount,
        currency: payment.currency,
      };
    }

    // ── Stripe ─────────────────────────────────
    if (payload.provider === "STRIPE") {
      const session = await stripeCreateSession({
        amount: payload.amount,
        currency: payload.currency || "usd",
        invoiceNumber,
        memberName: member.user.name,
        paymentId: payment.id,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripeSessionId: session.id },
      });

      return {
        paymentId: payment.id,
        provider: "STRIPE",
        redirectUrl: session.url,
        stripeSessionId: session.id,
        amount: payment.amount,
        currency: payment.currency,
      };
    }

    // ── SSLCommerz ─────────────────────────────
    if (payload.provider === "SSLCOMMERZ") {
      const sslRes = await sslInitPayment({
        amount: payload.amount,
        currency: "BDT",
        tranId: payment.id,
        customerName: member.user.name,
        customerEmail: member.user.email,
        customerPhone: member.user.phone || "01700000000",
        customerAddress: member.mess.address || "Dhaka, Bangladesh",
      });

      if (sslRes.status !== "SUCCESS") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", failureReason: sslRes.failedreason },
        });
        throw new AppError(sslRes.failedreason || "SSLCommerz initiation failed", HTTP_STATUS.BAD_REQUEST);
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { sslTranId: payment.id },
      });

      return {
        paymentId: payment.id,
        provider: "SSLCOMMERZ",
        redirectUrl: sslRes.GatewayPageURL,
        amount: payment.amount,
        currency: payment.currency,
      };
    }

    throw new AppError("Invalid payment provider", HTTP_STATUS.BAD_REQUEST);
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Provider API error" },
    }).catch(() => null);
    throw error;
  }
};

// ==================== bKash CALLBACK ====================
const handleBkashCallback = async (query: {
  paymentID?: string;
  status?: string;
}) => {
  const { paymentID, status } = query;
  if (!paymentID) return { success: false, message: "Missing paymentID" };

  if (status === "cancel" || status === "failure") {
    await prisma.payment.updateMany({
      where: { bkashPaymentId: paymentID },
      data: {
        status: status === "cancel" ? "CANCELLED" : "FAILED",
        failureReason: status === "cancel" ? "User cancelled" : "Payment failed on bKash",
      },
    });
    return { success: false, message: `Payment ${status}` };
  }

  try {
    const executeRes = await bkashExecutePayment(paymentID);
    const payment = await prisma.payment.findFirst({
      where: { bkashPaymentId: paymentID },
      select: { id: true, amount: true, memberId: true, userId: true, status: true },
    });

    if (!payment) return { success: false, message: "Payment record not found" };
    if (payment.status !== "PENDING") return { success: true, message: "Already processed" };

    if (executeRes.statusCode === "0000" && executeRes.transactionStatus === "Completed") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCESS", bkashTrxId: executeRes.trxID, callbackData: executeRes },
        });
        await tx.member.update({
          where: { id: payment.memberId },
          data: { totalBalance: { increment: payment.amount } },
        });
      });

      await notifyAndEmit(payment.userId, payment.id, payment.amount, executeRes.trxID, true, "bKash");
      return { success: true, message: "Payment successful", trxID: executeRes.trxID };
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: executeRes.statusMessage, callbackData: executeRes },
    });
    await notifyAndEmit(payment.userId, payment.id, payment.amount, paymentID, false, "bKash");
    return { success: false, message: executeRes.statusMessage };
  } catch {
    return { success: false, message: "Execution failed" };
  }
};

// ==================== STRIPE WEBHOOK ====================
const handleStripeWebhook = async (req: Request) => {
  const signature = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = stripeVerifyWebhook(req.body as Buffer, signature);
  } catch {
    throw new AppError("Invalid Stripe webhook signature", HTTP_STATUS.BAD_REQUEST);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const paymentId = session.metadata?.paymentId;

    if (!paymentId) return { received: true };

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, memberId: true, userId: true, status: true },
    });

    if (!payment || payment.status !== "PENDING") return { received: true };

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          stripePaymentIntentId: paymentIntentId,
          callbackData: session,
        },
      });
      await tx.member.update({
        where: { id: payment.memberId },
        data: { totalBalance: { increment: payment.amount } },
      });
    });

    await notifyAndEmit(
      payment.userId,
      payment.id,
      payment.amount,
      session.id,
      true,
      "Stripe"
    );
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as any;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: "PENDING" },
        data: { status: "CANCELLED", failureReason: "Session expired" },
      });
    }
  }

  return { received: true };
};

// ==================== SSL SUCCESS ====================
const handleSslSuccess = async (body: Record<string, string>) => {
  const { tran_id, val_id, status } = body;

  if (status !== "VALID" && status !== "VALIDATED") {
    return { success: false, message: "Invalid SSL status" };
  }

  const validation = await sslValidateIPN(val_id);

  if (
    validation.status !== "VALID" &&
    validation.status !== "VALIDATED"
  ) {
    return { success: false, message: "IPN validation failed" };
  }

  const payment = await prisma.payment.findFirst({
    where: { sslTranId: tran_id },
    select: { id: true, amount: true, memberId: true, userId: true, status: true },
  });

  if (!payment) return { success: false, message: "Payment not found" };
  if (payment.status !== "PENDING") return { success: true, message: "Already processed" };

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        sslValId: val_id,
        callbackData: body as any,
      },
    });
    await tx.member.update({
      where: { id: payment.memberId },
      data: { totalBalance: { increment: payment.amount } },
    });
  });

  await notifyAndEmit(
    payment.userId,
    payment.id,
    payment.amount,
    tran_id,
    true,
    "SSLCommerz"
  );

  return { success: true, message: "Payment successful" };
};

// ==================== SSL FAIL / CANCEL ====================
const handleSslFailOrCancel = async (
  body: Record<string, string>,
  type: "FAILED" | "CANCELLED"
) => {
  const { tran_id } = body;

  await prisma.payment.updateMany({
    where: { sslTranId: tran_id, status: "PENDING" },
    data: {
      status: type,
      failureReason: type === "FAILED" ? "SSLCommerz payment failed" : "User cancelled",
      callbackData: body as any,
    },
  });

  return { success: false, message: `Payment ${type.toLowerCase()}` };
};

// ==================== SSL IPN ====================
const handleSslIPN = async (body: Record<string, string>) => {
  const { tran_id, val_id, status } = body;

  if (status !== "VALID" && status !== "VALIDATED") return { received: true };

  const payment = await prisma.payment.findFirst({
    where: { sslTranId: tran_id },
    select: { id: true, amount: true, memberId: true, userId: true, status: true },
  });

  if (!payment || payment.status !== "PENDING") return { received: true };

  const validation = await sslValidateIPN(val_id);
  if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
    return { received: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", sslValId: val_id, callbackData: body as any },
    });
    await tx.member.update({
      where: { id: payment.memberId },
      data: { totalBalance: { increment: payment.amount } },
    });
  });

  await notifyAndEmit(payment.userId, payment.id, payment.amount, tran_id, true, "SSLCommerz");
  return { received: true };
};

// ==================== GET MY PAYMENTS ====================
const getMyPayments = async (userId: string, query: TGetPaymentsQuery) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };
  if (query.status) where.status = query.status;
  if (query.provider) where.provider = query.provider;
  if (query.memberId) where.memberId = query.memberId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ where, select: paymentSelect, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.payment.count({ where }),
  ]);

  return { payments, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// ==================== GET ALL PAYMENTS (Admin) ====================
const getAllPayments = async (query: TGetPaymentsQuery) => {
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.provider) where.provider = query.provider;
  if (query.memberId) where.memberId = query.memberId;

  const [payments, total, stats] = await Promise.all([
    prisma.payment.findMany({ where, select: paymentSelect, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({
      by: ["status", "provider"],
      _count: { status: true },
      _sum: { amount: true },
    }),
  ]);

  const groupedStats = stats.reduce(
    (acc, curr) => {
      const key = `${curr.provider}_${curr.status}`;
      acc[key] = { count: curr._count.status, totalAmount: curr._sum.amount || 0 };
      return acc;
    },
    {} as Record<string, { count: number; totalAmount: number }>
  );

  return { payments, stats: groupedStats, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// ==================== GET BY ID ====================
const getPaymentById = async (paymentId: string, userId: string, userRole: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { ...paymentSelect, callbackData: true },
  });

  if (!payment) throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  if (userRole !== "ADMIN" && payment.member.user.id !== userId)
    throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);

  return payment;
};

// ==================== REFUND ====================
const refundPayment = async (paymentId: string, payload: TRefundPaymentInput) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      status: true,
      provider: true,
      bkashPaymentId: true,
      bkashTrxId: true,
      stripePaymentIntentId: true,
      sslTranId: true,
      memberId: true,
      userId: true,
      callbackData: true,
    },
  });

  if (!payment) throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  if (payment.status !== "SUCCESS")
    throw new AppError("Only successful payments can be refunded", HTTP_STATUS.BAD_REQUEST);

  // ── bKash refund ───────────────────────────
  if (payment.provider === "BKASH") {
    if (!payment.bkashPaymentId || !payment.bkashTrxId)
      throw new AppError("Missing bKash transaction data", HTTP_STATUS.BAD_REQUEST);

    const refundRes = await bkashRefundPayment({
      paymentID: payment.bkashPaymentId,
      trxID: payment.bkashTrxId,
      amount: payment.amount.toString(),
      reason: payload.reason,
      sku: payment.id,
    });

    if (refundRes.statusCode !== "0000")
      throw new AppError(refundRes.statusMessage || "bKash refund failed", HTTP_STATUS.BAD_REQUEST);
  }

  // ── Stripe refund ──────────────────────────
  if (payment.provider === "STRIPE") {
    if (!payment.stripePaymentIntentId)
      throw new AppError("Missing Stripe payment intent", HTTP_STATUS.BAD_REQUEST);

    await stripeRefund(payment.stripePaymentIntentId, payment.amount);
  }

  // ── SSLCommerz refund ──────────────────────
  if (payment.provider === "SSLCOMMERZ") {
    const callbackData = payment.callbackData as Record<string, string> | null;
    const bankTranId = callbackData?.bank_tran_id;
    if (!bankTranId)
      throw new AppError("Missing SSLCommerz bank transaction ID", HTTP_STATUS.BAD_REQUEST);

    const refundRes = await sslRefund({
      bankTranId,
      refundAmount: payment.amount,
      refundRemarks: payload.reason,
    });

    if (refundRes.status !== "success")
      throw new AppError(refundRes.errorReason || "SSL refund failed", HTTP_STATUS.BAD_REQUEST);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
    await tx.member.update({
      where: { id: payment.memberId },
      data: { totalBalance: { decrement: payment.amount } },
    });
  });

  await NotificationService.create({
    userId: payment.userId,
    title: "Payment refunded",
    message: `Your ${payment.provider} payment of ৳${payment.amount} has been refunded.`,
    type: "BALANCE",
    relatedId: paymentId,
    relatedType: "PAYMENT",
  });

  return { message: "Payment refunded successfully" };
};

export const PaymentService = {
  initiatePayment,
  handleBkashCallback,
  handleStripeWebhook,
  handleSslSuccess,
  handleSslFailOrCancel,
  handleSslIPN,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  refundPayment,
};