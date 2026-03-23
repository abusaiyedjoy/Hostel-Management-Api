import { z } from "zod";

const sendOtpSchema = z.object({
  body: z.object({
    identifier: z
      .string({ error: "Email or phone number is required" })
      .min(5, "Invalid email or phone number")
      .trim(),
    purpose: z.enum(["VERIFY_EMAIL", "FORGOT_PASSWORD", "VERIFY_PHONE"], {
      error: "Purpose is required",
    }),
    channel: z.enum(["EMAIL", "PHONE"], {
      error: "Channel is required (EMAIL or PHONE)",
    }),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    identifier: z
      .string({ error: "Email or phone number is required" })
      .min(5, "Invalid identifier")
      .trim(),
    otp: z
      .string({ error: "OTP is required" })
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must be 6 numeric digits"),
    purpose: z.enum(["VERIFY_EMAIL", "FORGOT_PASSWORD", "VERIFY_PHONE"]),
    channel: z.enum(["EMAIL", "PHONE"]),
  }),
});

const otpStatusSchema = z.object({
  query: z.object({
    identifier: z.string().min(5).trim(),
    purpose: z.enum(["VERIFY_EMAIL", "FORGOT_PASSWORD", "VERIFY_PHONE"]),
  }),
});

export type TSendOtpInput = z.infer<typeof sendOtpSchema>["body"];
export type TVerifyOtpInput = z.infer<typeof verifyOtpSchema>["body"];

export const OtpSchema = {
  sendOtpSchema,
  verifyOtpSchema,
  otpStatusSchema,
};
