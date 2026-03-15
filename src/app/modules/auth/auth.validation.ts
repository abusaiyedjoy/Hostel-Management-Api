import { z } from "zod";

const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Name is required" })
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .trim(),
    email: z
      .string({ message: "Email is required" })
      .email("Invalid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string({ message: "Password is required" })
      .min(6, "Password must be at least 6 characters")
      .max(32, "Password must be less than 32 characters"),
    phone: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Invalid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string({ message: "Password is required" })
      .min(1, "Password is required"),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({ message: "Current password is required" })
      .min(1, "Current password is required"),
    newPassword: z
      .string({ message: "New password is required" })
      .min(6, "New password must be at least 6 characters")
      .max(32, "New password must be less than 32 characters"),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .trim()
      .optional(),
    phone: z.string().optional(),
    image: z.string().url("Invalid image URL").optional(),
  }),
});

export type TRegisterInput = z.infer<typeof registerSchema>["body"];
export type TLoginInput = z.infer<typeof loginSchema>["body"];
export type TChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
export type TUpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];

export const AuthSchema = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
};
