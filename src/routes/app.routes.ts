import { Router } from "express";
import { AuthRoutes } from "../app/modules/auth/auth.route";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is healthy ✅",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

router.use("/auth", AuthRoutes);

export const appRoutes = router;
