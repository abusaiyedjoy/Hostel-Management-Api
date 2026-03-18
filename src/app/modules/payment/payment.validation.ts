import { z } from "zod";

const initiatePaymentSchema = z.object({
  body: z.object({
    amount: z
      .number({ error: "Amount is required" })
      .min(1, "Minimum amount is 1 BDT")
      .max(50000, "Maximum amount is 50,000 BDT"),
    memberId: z
      .string({ error: "Member ID is required" })
      .cuid("Invalid member ID"),
  }),
});

const getPaymentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("10"),
    status: z
      .enum(["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"])
      .optional(),
    memberId: z.string().cuid("Invalid member ID").optional(),
  }),
});

const refundPaymentSchema = z.object({
  body: z.object({
    reason: z
      .string({ error: "Reason is required" })
      .min(3, "Reason must be at least 3 characters"),
  }),
});

export type TInitiatePaymentInput = z.infer<
  typeof initiatePaymentSchema
>["body"];
export type TGetPaymentsQuery = z.infer<typeof getPaymentsQuerySchema>["query"];
export type TRefundPaymentInput = z.infer<typeof refundPaymentSchema>["body"];

export const PaymentSchema = {
  initiatePaymentSchema,
  getPaymentsQuerySchema,
  refundPaymentSchema,
};
