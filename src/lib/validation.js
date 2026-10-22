import { z } from "zod";

/**
 * Client-side validation. Mirrors the server schemas in
 * server/src/validators/index.ts so the user gets instant feedback and the
 * server still enforces the same rules independently.
 */

export const emailRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .email("That does not look like an email address.");

export const passwordRule = z
  .string()
  .min(8, "Password needs at least 8 characters.")
  .max(128)
  .regex(/[a-zA-Z]/, "Password needs at least one letter.")
  .regex(/[0-9]/, "Password needs at least one number.");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "We need something to call you.").max(100, "That name is too long."),
  email: emailRule,
  password: passwordRule,
});

export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, "Password is required."),
});

export const targetSchema = z.object({
  title: z.string().trim().min(1, "Give it a title.").max(140, "Keep the title short."),
  description: z.string().trim().max(2000, "That description is too long.").optional(),
  dueAt: z.string().min(1, "Pick a deadline."),
  chaosLevel: z.number().int().min(1).max(5),
  personality: z.string().min(1),
});

export const stepSchema = z.object({
  label: z.string().trim().min(1, "A step needs a label.").max(200, "Keep it short."),
});

export const feedbackSchema = z.object({
  message: z.string().trim().min(3, "Tell us a bit more.").max(2000, "That is a lot of feedback."),
});

/**
 * Turns a ZodError into { field: message } for inline error rendering.
 */
export function fieldErrors(error) {
  if (!error || !error.flatten) return {};
  const flat = error.flatten().fieldErrors;
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    if (Array.isArray(value) && value.length) out[key] = value[0];
  }
  return out;
}
