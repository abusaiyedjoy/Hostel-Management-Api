import twilio from "twilio";
import { env } from "../config/env";

let twilioClient: twilio.Twilio | null = null;

const getClient = (): twilio.Twilio => {
  if (!twilioClient) {
    if (!env.TWILIO.ACCOUNT_SID || !env.TWILIO.AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }
    twilioClient = twilio(env.TWILIO.ACCOUNT_SID, env.TWILIO.AUTH_TOKEN);
  }
  return twilioClient;
};

const buildSmsText = (otp: string, purpose: string): string => {
  const purposeLabels: Record<string, string> = {
    VERIFY_EMAIL: "email verification",
    FORGOT_PASSWORD: "password reset",
    VERIFY_PHONE: "phone verification",
  };
  const label = purposeLabels[purpose] || "verification";
  const expiresInMinutes = Math.ceil(
    parseInt(process.env.OTP_EXPIRES_IN_SECONDS || "300") / 60,
  );
  return `Your Hostel Hub ${label} OTP is: ${otp}\nExpires in ${expiresInMinutes} min. Do not share.`;
};

export const sendOtpSms = async (
  to: string,
  otp: string,
  purpose: string,
): Promise<void> => {
  const client = getClient();
  await client.messages.create({
    body: buildSmsText(otp, purpose),
    from: env.TWILIO.PHONE_NUMBER,
    to,
  });
};
