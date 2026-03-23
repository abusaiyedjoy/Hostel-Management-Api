import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP.HOST,
  port: env.SMTP.PORT,
  secure: env.SMTP.PORT === 465,
  auth: {
    user: env.SMTP.USER,
    pass: env.SMTP.PASS,
  },
});

// ─── OTP email template ────────────────────────────
const buildOtpEmail = (
  otp: string,
  purpose: string,
  expiresInMinutes: number,
) => {
  const purposeLabels: Record<string, string> = {
    VERIFY_EMAIL: "Email Verification",
    FORGOT_PASSWORD: "Password Reset",
    VERIFY_PHONE: "Phone Verification",
  };

  const label = purposeLabels[purpose] || "Verification";

  return {
    subject: `Your ${label} OTP — Hostel Hub`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hostel Hub</h2>
        <h3 style="color: #444; font-weight: normal; margin-bottom: 24px;">${label}</h3>
        <p style="color: #555; font-size: 15px;">Use the OTP below to complete your ${label.toLowerCase()}:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #222;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 13px;">This OTP expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #bbb; font-size: 12px;">Hostel Hub · Automated message, do not reply</p>
      </div>
    `,
    text: `Your Hostel Hub ${label} OTP is: ${otp}\n\nExpires in ${expiresInMinutes} minutes.\n\nIf you did not request this, ignore this message.`,
  };
};

export const sendOtpEmail = async (
  to: string,
  otp: string,
  purpose: string,
): Promise<void> => {
  const expiresInMinutes = Math.ceil(
    parseInt(process.env.OTP_EXPIRES_IN_SECONDS || "300") / 60,
  );
  const { subject, html, text } = buildOtpEmail(otp, purpose, expiresInMinutes);

  await transporter.sendMail({
    from: env.SMTP.FROM,
    to,
    subject,
    html,
    text,
  });
};

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
};
