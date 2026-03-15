import { z } from "zod";

const assignMealManagerSchema = z.object({
  body: z.object({
    userId: z.string({ error: "User ID is required" }).cuid("Invalid user ID"),
  }),
});

const getMealManagersQuerySchema = z.object({
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

const updateMealManagerStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({
      error: "isActive is required",
    }),
  }),
});

export type TAssignMealManagerInput = z.infer<
  typeof assignMealManagerSchema
>["body"];
export type TGetMealManagersQuery = z.infer<
  typeof getMealManagersQuerySchema
>["query"];
export type TUpdateMealManagerStatus = z.infer<
  typeof updateMealManagerStatusSchema
>["body"];

export const MealManagerSchema = {
  assignMealManagerSchema,
  getMealManagersQuerySchema,
  updateMealManagerStatusSchema,
};
