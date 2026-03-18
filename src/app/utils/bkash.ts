import axios from "axios";
import { env } from "../config/env";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// ─── Get Token (cached, auto-refresh) ─────────────
export const getBkashToken = async (): Promise<string> => {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const response = await axios.post(
    `${env.BKASH.BASE_URL}/tokenized/checkout/token/grant`,
    {
      app_key: env.BKASH.APP_KEY,
      app_secret: env.BKASH.APP_SECRET,
    },
    {
      headers: {
        username: env.BKASH.USERNAME,
        password: env.BKASH.PASSWORD,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  const data = response.data;

  if (!data.id_token) {
    throw new Error("Failed to get bKash token");
  }

  cachedToken = data.id_token;
  // Token typically expires in 3600s
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;

  return cachedToken as string;
};

// ─── Create Payment ────────────────────────────────
export const bkashCreatePayment = async (payload: {
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}) => {
  const token = await getBkashToken();

  const response = await axios.post(
    `${env.BKASH.BASE_URL}/tokenized/checkout/create`,
    {
      ...payload,
      callbackURL: env.BKASH.CALLBACK_URL,
    },
    {
      headers: {
        Authorization: token,
        "X-APP-Key": env.BKASH.APP_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  return response.data;
};

// ─── Execute Payment ───────────────────────────────
export const bkashExecutePayment = async (paymentID: string) => {
  const token = await getBkashToken();

  const response = await axios.post(
    `${env.BKASH.BASE_URL}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        Authorization: token,
        "X-APP-Key": env.BKASH.APP_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  return response.data;
};

// ─── Query Payment ─────────────────────────────────
export const bkashQueryPayment = async (paymentID: string) => {
  const token = await getBkashToken();

  const response = await axios.post(
    `${env.BKASH.BASE_URL}/tokenized/checkout/payment/status`,
    { paymentID },
    {
      headers: {
        Authorization: token,
        "X-APP-Key": env.BKASH.APP_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  return response.data;
};

// ─── Refund Payment ────────────────────────────────
export const bkashRefundPayment = async (payload: {
  paymentID: string;
  trxID: string;
  amount: string;
  reason: string;
  sku: string;
}) => {
  const token = await getBkashToken();

  const response = await axios.post(
    `${env.BKASH.BASE_URL}/tokenized/checkout/payment/refund`,
    payload,
    {
      headers: {
        Authorization: token,
        "X-APP-Key": env.BKASH.APP_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  return response.data;
};
