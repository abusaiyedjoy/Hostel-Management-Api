import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { env } from "./app/config/env";
import { prisma } from "./app/config/prisma";
import { initSocket } from "./app/utils/socket";
import os from "os";
import { redis } from "./app/config/redis";

const getNetworkIP = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) return alias.address;
    }
  }
  return "localhost";
};

const startServer = async () => {
  try {
    await prisma.$connect();

    await redis.connect();
    console.log("✅ Redis connected");

    // Create HTTP server from Express app
    const httpServer = http.createServer(app);

    // Init Socket.io on the same HTTP server
    const io = initSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      const networkIP = getNetworkIP();
      console.log("\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🏨  HOSTEL MANAGEMENT API SERVER");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📌  Status      : ✅ Running`);
      console.log(`🌍  Environment : ${env.NODE_ENV}`);
      console.log("─────────────────────────────────────────────────────");
      console.log("🔗  URLs:");
      console.log(`    Local       : http://localhost:${env.PORT}`);
      console.log(`    Network     : http://${networkIP}:${env.PORT}`);
      console.log(`    Health      : http://localhost:${env.PORT}/api/health`);
      console.log("─────────────────────────────────────────────────────");
      console.log("📡  API Endpoints:");
      console.log(`    Auth        : http://localhost:${env.PORT}/api/auth`);
      console.log(`    Mess        : http://localhost:${env.PORT}/api/mess`);
      console.log(
        `    Meals       : http://localhost:${env.PORT}/api/mess/:messId/meals`,
      );
      console.log(
        `    Members     : http://localhost:${env.PORT}/api/mess/:messId/members`,
      );
      console.log(
        `    Notifications: http://localhost:${env.PORT}/api/notifications`,
      );
      console.log(
        `    Messages    : http://localhost:${env.PORT}/api/messages`,
      );
      console.log("─────────────────────────────────────────────────────");
      console.log(`🔌  Socket.io   : ✅ Running on ws://localhost:${env.PORT}`);
      console.log(`🗄️   Database    : ✅ Connected (PostgreSQL)`);
      console.log(`⏰  Started At  : ${new Date().toLocaleString()}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason: Error) => {
  console.error("❌ Unhandled Rejection:", reason.message);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("\n⚠️  SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  console.log("✅ Database disconnected");
  await redis.quit();
  console.log("✅ Redis disconnected");
  process.exit(0);
});

startServer();
