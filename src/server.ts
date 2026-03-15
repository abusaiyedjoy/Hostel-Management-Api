import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { env } from "./app/config/env";
import { prisma } from "./app/config/prisma";
import os from "os";

// Get local network IP
const getNetworkIP = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "localhost";
};

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();

    app.listen(env.PORT, () => {
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
      console.log("🗄️   Database    : ✅ Connected (PostgreSQL)");
      console.log(`⏰  Started At  : ${new Date().toLocaleString()}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n");
    });
  } catch (error) {
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌  SERVER FAILED TO START");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: Error) => {
  console.error("❌ Unhandled Rejection:", reason.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error.message);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("\n⚠️  SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  console.log("✅ Database disconnected");
  console.log("👋 Server shut down\n");
  process.exit(0);
});

startServer();
