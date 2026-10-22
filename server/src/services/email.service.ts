import nodemailer from "nodemailer";
import { config } from "../config.js";

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

/**
 * With no SMTP configured (local dev, CI) we fall back to logging the email
 * body to stdout. The verification and reset links are then readable straight
 * from the server console, which keeps the whole flow demonstrable offline.
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  if (!transporter) {
    console.log("=== EMAIL (no SMTP configured) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("====================================");
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
}

export async function sendVerificationEmail(to: string, name: string, link: string): Promise<void> {
  await sendEmail(
    to,
    "Confirm your Panic Plan account",
    `Hi ${name},\n\nConfirm your email to finish setting up Panic Plan:\n${link}\n\nThe link expires in 24 hours. If you did not sign up, ignore this email.\n\n- Panic Plan`,
  );
}

export async function sendPasswordResetEmail(to: string, name: string, link: string): Promise<void> {
  await sendEmail(
    to,
    "Reset your Panic Plan password",
    `Hi ${name},\n\nReset your password here:\n${link}\n\nThe link expires in 1 hour. If you did not ask for this, ignore this email and nothing will change.\n\n- Panic Plan`,
  );
}
