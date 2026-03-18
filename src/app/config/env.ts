import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_NAME",
  "ADMIN_PHONE",
  "BKASH_BASE_URL",
  "BKASH_APP_KEY",
  "BKASH_APP_SECRET",
  "BKASH_USERNAME",
  "BKASH_PASSWORD",
  "BKASH_CALLBACK_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`❌ Missing required environment variable: ${envVar}`);
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  PORT: parseInt(process.env.PORT || "5000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL as string,
    PASSWORD: process.env.ADMIN_PASSWORD as string,
    NAME: process.env.ADMIN_NAME as string,
    PHONE: process.env.ADMIN_PHONE as string,
  },
  BKASH: {
    BASE_URL: process.env.BKASH_BASE_URL as string,
    APP_KEY: process.env.BKASH_APP_KEY as string,
    APP_SECRET: process.env.BKASH_APP_SECRET as string,
    USERNAME: process.env.BKASH_USERNAME as string,
    PASSWORD: process.env.BKASH_PASSWORD as string,
    CALLBACK_URL: process.env.BKASH_CALLBACK_URL as string,
  },
};
