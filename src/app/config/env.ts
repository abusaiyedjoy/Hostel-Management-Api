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
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SUCCESS_URL",
  "STRIPE_CANCEL_URL",
  "SSL_STORE_ID",
  "SSL_STORE_PASSWORD",
  "SSL_SUCCESS_URL",
  "SSL_FAIL_URL",
  "SSL_CANCEL_URL",
  "SSL_IPN_URL",
  "REDIS_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "OTP_EXPIRES_IN_SECONDS",
  "OTP_MAX_ATTEMPTS",
  "OTP_RESEND_COOLDOWN_SECONDS",
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
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
    SUCCESS_URL: process.env.STRIPE_SUCCESS_URL as string,
    CANCEL_URL: process.env.STRIPE_CANCEL_URL as string,
  },
  SSL: {
    STORE_ID: process.env.SSL_STORE_ID as string,
    STORE_PASSWORD: process.env.SSL_STORE_PASSWORD as string,
    IS_LIVE: process.env.SSL_IS_LIVE === "true",
    SUCCESS_URL: process.env.SSL_SUCCESS_URL as string,
    FAIL_URL: process.env.SSL_FAIL_URL as string,
    CANCEL_URL: process.env.SSL_CANCEL_URL as string,
    IPN_URL: process.env.SSL_IPN_URL as string,
    FRONTEND_SUCCESS_URL: process.env.SSL_FRONTEND_SUCCESS_URL as string,
    FRONTEND_FAIL_URL: process.env.SSL_FRONTEND_FAIL_URL as string,
  },
  REDIS: {
    URL: process.env.REDIS_URL as string,
  },
  SMTP: {
    HOST: process.env.SMTP_HOST as string,
    PORT: parseInt(process.env.SMTP_PORT || "587"),
    USER: process.env.SMTP_USER as string,
    PASS: process.env.SMTP_PASS as string,
    FROM: process.env.SMTP_FROM || "Hostel Hub <noreply@hostelhub.com>",
  },
  TWILIO: {
    ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
  },
  OTP: {
    EXPIRES_IN: parseInt(process.env.OTP_EXPIRES_IN_SECONDS || "300"),
    MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || "5"),
    RESEND_COOLDOWN: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || "60"),
  },
};
