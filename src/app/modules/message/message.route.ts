import { Router } from "express";
import { MessageController } from "./message.controller";
import { MessageSchema } from "./message.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authorize("LOGGED_IN"),
  validateRequest(MessageSchema.getMessagesQuerySchema),
  MessageController.getMessMessages,
);

router.delete("/:id", authorize("LOGGED_IN"), MessageController.deleteMessage);

export const MessageRoutes = router;
