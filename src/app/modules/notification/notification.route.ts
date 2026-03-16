import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { NotificationSchema } from "./notification.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// All routes require authentication
router.use(authorize("LOGGED_IN"));

// ─── Get ──────────────────────────────────────────
router.get(
  "/",
  validateRequest(NotificationSchema.getNotificationsQuerySchema),
  NotificationController.getMyNotifications,
);

router.get("/unread-count", NotificationController.getUnreadCount);

// ─── Update ───────────────────────────────────────
router.patch(
  "/mark-read",
  validateRequest(NotificationSchema.markReadSchema),
  NotificationController.markAsRead,
);

router.patch("/mark-all-read", NotificationController.markAllAsRead);

// ─── Delete ───────────────────────────────────────
router.delete("/clear-all", NotificationController.clearAll);
router.delete("/:id", NotificationController.deleteNotification);

export const NotificationRoutes = router;
