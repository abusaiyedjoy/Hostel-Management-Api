import { z } from "zod";

const getMessagesQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("30"),
    before: z.string().optional(),
  }),
});

export type TGetMessagesQuery = z.infer<typeof getMessagesQuerySchema>["query"];

export const MessageSchema = { getMessagesQuerySchema };
