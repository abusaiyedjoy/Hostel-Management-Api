import { z } from "zod";

const addMemberSchema = z.object({
  body: z.object({
    userId: z.string({ error: "User ID is required" }).cuid("Invalid user ID"),
    messId: z.string({ error: "Mess ID is required" }).cuid("Invalid mess ID"),
    registrationNo: z
      .string({ error: "Registration number is required" })
      .min(3, "Registration number must be at least 3 characters")
      .trim(),
    dateOfJoining: z
      .string({ error: "Date of joining is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      })
      .transform((val) => new Date(val)),
    totalBalance: z
      .number()
      .min(0, "Balance cannot be negative")
      .optional()
      .default(0),
  }),
});

const updateMemberSchema = z.object({
  body: z.object({
    registrationNo: z
      .string()
      .min(3, "Registration number must be at least 3 characters")
      .trim()
      .optional(),
    dateOfJoining: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      })
      .transform((val) => new Date(val))
      .optional(),
    totalBalance: z.number().min(0, "Balance cannot be negative").optional(),
    isActive: z.boolean().optional(),
  }),
});

const getMembersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("10"),
    search: z.string().optional(),
    isActive: z
      .enum(["true", "false"])
      .optional()
      .transform((val) =>
        val === "true" ? true : val === "false" ? false : undefined,
      ),
  }),
});

export type TAddMemberInput = z.infer<typeof addMemberSchema>["body"];
export type TUpdateMemberInput = z.infer<typeof updateMemberSchema>["body"];
export type TGetMembersQuery = z.infer<typeof getMembersQuerySchema>["query"];

export const MemberSchema = {
  addMemberSchema,
  updateMemberSchema,
  getMembersQuerySchema,
};
