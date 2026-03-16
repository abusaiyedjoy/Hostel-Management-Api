import { z } from "zod";
import { NotificationType } from "@prisma/client";

const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("20"),
    isRead: z
      .enum(["true", "false"])
      .optional()
      .transform((val) =>
        val === "true" ? true : val === "false" ? false : undefined,
      ),
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

const markReadSchema = z.object({
  body: z.object({
    notificationIds: z
      .array(z.string().cuid("Invalid notification ID"))
      .min(1, "At least one notification ID is required"),
  }),
});

export type TGetNotificationsQuery = z.infer<
  typeof getNotificationsQuerySchema
>["query"];
export type TMarkReadInput = z.infer<typeof markReadSchema>["body"];

export const NotificationSchema = {
  getNotificationsQuerySchema,
  markReadSchema,
};
