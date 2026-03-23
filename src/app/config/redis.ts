import Redis from "ioredis";
import { env } from "./env";

const createRedisClient = () => {
  const client = new Redis(env.REDIS.URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  client.on("connect", () => {
    console.log("✅ Redis connected");
  });

  client.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });

  client.on("close", () => {
    console.warn("⚠️  Redis connection closed");
  });

  return client;
};

export const redis = createRedisClient();
