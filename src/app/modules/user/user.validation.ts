import { z } from "zod";
import { Role } from "@prisma/client";

const updateRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role, {
      error: "Role is required",
    }),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({
      error: "isActive is required",
    }),
  }),
});

const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("10"),
    role: z.nativeEnum(Role).optional(),
    search: z.string().optional(),
    isActive: z
      .enum(["true", "false"])
      .optional()
      .transform((val) =>
        val === "true" ? true : val === "false" ? false : undefined,
      ),
  }),
});

export type TUpdateRoleInput = z.infer<typeof updateRoleSchema>["body"];
export type TUpdateStatusInput = z.infer<typeof updateStatusSchema>["body"];
export type TGetUsersQuery = z.infer<typeof getUsersQuerySchema>["query"];

export const UserSchema = {
  updateRoleSchema,
  updateStatusSchema,
  getUsersQuerySchema,
};
