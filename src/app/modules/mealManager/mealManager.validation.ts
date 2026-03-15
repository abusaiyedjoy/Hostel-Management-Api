import { z } from "zod";
import { MealType, MealStatus } from "@prisma/client";

const createMealSchema = z.object({
  body: z.object({
    mealType: z.nativeEnum(MealType, {
      error: "Meal type is required",
    }),
    date: z
      .string({ error: "Date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      })
      .transform((val) => new Date(val)),
    costPerMeal: z
      .number({ error: "Cost per meal is required" })
      .min(0, "Cost per meal cannot be negative"),
    note: z
      .string()
      .max(500, "Note must be less than 500 characters")
      .optional(),
  }),
});

const updateMealSchema = z.object({
  body: z.object({
    mealType: z.nativeEnum(MealType).optional(),
    date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      })
      .transform((val) => new Date(val))
      .optional(),
    costPerMeal: z
      .number()
      .min(0, "Cost per meal cannot be negative")
      .optional(),
    note: z
      .string()
      .max(500, "Note must be less than 500 characters")
      .optional(),
  }),
});

const getMealsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("10"),
    mealType: z.nativeEnum(MealType).optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid start date",
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid end date",
      })
      .optional(),
  }),
});

const createMealEntrySchema = z.object({
  body: z.object({
    memberId: z
      .string({ error: "Member ID is required" })
      .cuid("Invalid member ID"),
    status: z.nativeEnum(MealStatus).optional().default(MealStatus.TAKEN),
    note: z
      .string()
      .max(500, "Note must be less than 500 characters")
      .optional(),
  }),
});

const bulkCreateMealEntrySchema = z.object({
  body: z.object({
    memberIds: z
      .array(z.string().cuid("Invalid member ID"))
      .min(1, "At least one member ID is required"),
    status: z.nativeEnum(MealStatus).optional().default(MealStatus.TAKEN),
  }),
});

const updateMealEntrySchema = z.object({
  body: z.object({
    status: z.nativeEnum(MealStatus, {
      error: "Status is required",
    }),
    note: z
      .string()
      .max(500, "Note must be less than 500 characters")
      .optional(),
  }),
});

export type TCreateMealInput = z.infer<typeof createMealSchema>["body"];
export type TUpdateMealInput = z.infer<typeof updateMealSchema>["body"];
export type TGetMealsQuery = z.infer<typeof getMealsQuerySchema>["query"];
export type TCreateMealEntryInput = z.infer<
  typeof createMealEntrySchema
>["body"];
export type TBulkCreateMealEntryInput = z.infer<
  typeof bulkCreateMealEntrySchema
>["body"];
export type TUpdateMealEntryInput = z.infer<
  typeof updateMealEntrySchema
>["body"];

export const MealSchema = {
  createMealSchema,
  updateMealSchema,
  getMealsQuerySchema,
  createMealEntrySchema,
  bulkCreateMealEntrySchema,
  updateMealEntrySchema,
};
