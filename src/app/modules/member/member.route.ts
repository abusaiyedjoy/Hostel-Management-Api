import { Router } from "express";
import { MemberController } from "./member.controller";
import { MemberSchema } from "./member.validation";
import { authorize } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest.middleware";

// ─── Nested Router: /api/mess/:messId/members ─────
const messRouter = Router({ mergeParams: true });

messRouter.post(
  "/",
  authorize("ADMIN", "MESS_MANAGER"),
  validateRequest(MemberSchema.addMemberSchema),
  MemberController.addMember,
);

messRouter.get(
  "/",
  authorize("ADMIN", "MESS_MANAGER", "MEAL_MANAGER"),
  validateRequest(MemberSchema.getMembersQuerySchema),
  MemberController.getAllMembers,
);

messRouter.get("/:id", authorize("LOGGED_IN"), MemberController.getMemberById);

messRouter.patch(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER"),
  validateRequest(MemberSchema.updateMemberSchema),
  MemberController.updateMember,
);

messRouter.delete(
  "/:id",
  authorize("ADMIN", "MESS_MANAGER"),
  MemberController.removeMember,
);

// ─── Standalone Router: /api/members ──────────────
const memberRouter = Router();

memberRouter.get(
  "/my-profile",
  authorize("LOGGED_IN"),
  MemberController.getMyMemberProfile,
);

memberRouter.get(
  "/:id/meal-summary",
  authorize("LOGGED_IN"),
  MemberController.getMemberMealSummary,
);

export const MemberMessRoutes = messRouter;
export const MemberRoutes = memberRouter;
