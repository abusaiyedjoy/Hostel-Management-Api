import { z } from "zod";

const createMessSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Mess name is required" })
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .trim(),
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address")
      .toLowerCase()
      .trim(),
    phone: z
      .string({ error: "Phone is required" })
      .min(5, "Invalid phone number"),
    address: z
      .string({ error: "Address is required" })
      .min(5, "Address must be at least 5 characters")
      .trim(),
    city: z
      .string({ error: "City is required" })
      .min(2, "City must be at least 2 characters")
      .trim(),
    state: z
      .string({ error: "State is required" })
      .min(2, "State must be at least 2 characters")
      .trim(),
    capacity: z
      .number({ error: "Capacity is required" })
      .int("Capacity must be a whole number")
      .min(1, "Capacity must be at least 1"),
    ratePerMeal: z
      .number({ error: "Rate per meal is required" })
      .min(0, "Rate per meal cannot be negative"),
    managerId: z
      .string({ error: "Manager ID is required" })
      .cuid("Invalid manager ID"),
  }),
});

const updateMessSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .trim()
      .optional(),
    phone: z.string().min(5, "Invalid phone number").optional(),
    address: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .trim()
      .optional(),
    city: z
      .string()
      .min(2, "City must be at least 2 characters")
      .trim()
      .optional(),
    state: z
      .string()
      .min(2, "State must be at least 2 characters")
      .trim()
      .optional(),
    capacity: z
      .number()
      .int("Capacity must be a whole number")
      .min(1, "Capacity must be at least 1")
      .optional(),
    ratePerMeal: z
      .number()
      .min(0, "Rate per meal cannot be negative")
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

const getMessQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("10"),
    search: z.string().optional(),
    city: z.string().optional(),
    isActive: z
      .enum(["true", "false"])
      .optional()
      .transform((val) =>
        val === "true" ? true : val === "false" ? false : undefined,
      ),
  }),
});

export type TCreateMessInput = z.infer<typeof createMessSchema>["body"];
export type TUpdateMessInput = z.infer<typeof updateMessSchema>["body"];
export type TGetMessQuery = z.infer<typeof getMessQuerySchema>["query"];

export const MessSchema = {
  createMessSchema,
  updateMessSchema,
  getMessQuerySchema,
};
