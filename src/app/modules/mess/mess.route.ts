import { Router } from "express";
import { MessController } from "./mess.controller";
import { MessSchema } from "./mess.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

const router = Router();

// ─── Admin Only ───────────────────────────────────
router.post(
  "/",
  authorize("ADMIN"),
  validateRequest(MessSchema.createMessSchema),
  MessController.createMess,
);

router.delete("/:id", authorize("ADMIN"), MessController.deleteMess);

// ─── Admin + Mess Manager ─────────────────────────
router.get("/my-mess", authorize("MESS_MANAGER"), MessController.getMyMess);

router.get(
  "/:id/stats",
  authorize("ADMIN", "MESS_MANAGER"),
  MessController.getMessStats,
);

router.patch(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER"),
  validateRequest(MessSchema.updateMessSchema),
  MessController.updateMess,
);

// ─── All Authenticated Users ──────────────────────
router.get(
  "/",
  authorize("LOGGED_IN"),
  validateRequest(MessSchema.getMessQuerySchema),
  MessController.getAllMess,
);

router.get("/:id", authorize("LOGGED_IN"), MessController.getMessById);

export const MessRoutes = router;
