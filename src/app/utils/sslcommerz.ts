import axios from "axios";
import { env } from "../config/env";

const SSL_BASE_URL = env.SSL.IS_LIVE
  ? "https://securepay.sslcommerz.com"
  : "https://sandbox.sslcommerz.com";

// ─── Initiate Payment ──────────────────────────────
export const sslInitPayment = async (payload: {
  amount: number;
  currency: string;
  tranId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
}) => {
  const data = new URLSearchParams({
    store_id: env.SSL.STORE_ID,
    store_passwd: env.SSL.STORE_PASSWORD,
    total_amount: payload.amount.toString(),
    currency: payload.currency,
    tran_id: payload.tranId,
    success_url: env.SSL.SUCCESS_URL,
    fail_url: env.SSL.FAIL_URL,
    cancel_url: env.SSL.CANCEL_URL,
    ipn_url: env.SSL.IPN_URL,
    cus_name: payload.customerName,
    cus_email: payload.customerEmail,
    cus_phone: payload.customerPhone,
    cus_add1: payload.customerAddress,
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    product_name: "Hostel Meal Balance",
    product_category: "Service",
    product_profile: "service",
  });

  const response = await axios.post(
    `${SSL_BASE_URL}/gwprocess/v4/api.php`,
    data.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  return response.data;
};

// ─── Validate IPN ──────────────────────────────────
export const sslValidateIPN = async (valId: string) => {
  const response = await axios.get(
    `${SSL_BASE_URL}/validator/api/validationserverAPI.php`,
    {
      params: {
        val_id: valId,
        store_id: env.SSL.STORE_ID,
        store_passwd: env.SSL.STORE_PASSWORD,
        format: "json",
      },
    },
  );

  return response.data;
};

// ─── Refund ────────────────────────────────────────
export const sslRefund = async (payload: {
  bankTranId: string;
  refundAmount: number;
  refundRemarks: string;
}) => {
  const response = await axios.post(
    `${SSL_BASE_URL}/validator/api/merchantTransIDvalidationAPI.php`,
    null,
    {
      params: {
        store_id: env.SSL.STORE_ID,
        store_passwd: env.SSL.STORE_PASSWORD,
        refund_amount: payload.refundAmount,
        refund_remarks: payload.refundRemarks,
        bank_tran_id: payload.bankTranId,
        refe_id: `REF-${Date.now()}`,
        format: "json",
      },
    },
  );

  return response.data;
};
