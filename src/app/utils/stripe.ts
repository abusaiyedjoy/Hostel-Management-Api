import Stripe from "stripe";
import { env } from "../config/env";

export const stripe = new Stripe(env.STRIPE.SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});

// ─── Create Checkout Session ───────────────────────
export const stripeCreateSession = async (payload: {
  amount: number;
  currency: string;
  invoiceNumber: string;
  memberName: string;
  paymentId: string;
}) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: payload.currency.toLowerCase(),
          product_data: {
            name: "Hostel Meal Balance Deposit",
            description: `Deposit for ${payload.memberName} — Invoice: ${payload.invoiceNumber}`,
          },
          unit_amount: Math.round(payload.amount * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentId: payload.paymentId,
      invoiceNumber: payload.invoiceNumber,
    },
    success_url: `${env.STRIPE.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.STRIPE.CANCEL_URL}?payment_id=${payload.paymentId}`,
  });

  return session;
};

// ─── Verify Webhook Signature ──────────────────────
export const stripeVerifyWebhook = (
  payload: Buffer,
  signature: string,
): Stripe.Event => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE.WEBHOOK_SECRET,
  );
};

// ─── Retrieve Session ──────────────────────────────
export const stripeGetSession = async (sessionId: string) => {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
};

// ─── Refund ────────────────────────────────────────
export const stripeRefund = async (paymentIntentId: string, amount: number) => {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.round(amount * 100),
  });
};
