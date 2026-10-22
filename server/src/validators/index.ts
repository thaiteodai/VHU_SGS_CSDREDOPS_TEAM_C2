import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("That does not look like an email address.");

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password needs at least 8 characters.")
    .max(128)
    .regex(/[a-zA-Z]/, "Password needs at least one letter.")
    .regex(/[0-9]/, "Password needs at least one number."),
  name: z.string().trim().min(1, "We need something to call you.").max(100),
  showOnWall: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required."),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8, "Password needs at least 8 characters.")
    .max(128)
    .regex(/[a-zA-Z]/, "Password needs at least one letter.")
    .regex(/[0-9]/, "Password needs at least one number."),
});

export const verifySchema = z.object({ token: z.string().min(10) });

export const targetSchema = z.object({
  title: z.string().trim().min(1, "Give it a title.").max(140),
  description: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.coerce.date(),
  chaosLevel: z.coerce.number().int().min(1).max(5).optional().default(3),
  personality: z
    .enum([
      "OVERCONFIDENT_OPTIMIST",
      "SILENT_SLOBBER",
      "POLITE_DEFERRER",
      "CHAOTIC_SCHEDULER",
      "OPTIMISTIC_REALIST",
      "LAST_MINUTE_PANIC",
      "METHODICAL_MASOCHIST",
      "PROCALLED_PROVOCATIONIST",
    ])
    .optional()
    .default("OVERCONFIDENT_OPTIMIST"),
});

export const targetUpdateSchema = targetSchema.partial();

export const stepSchema = z.object({
  label: z.string().trim().min(1, "A step needs a label.").max(200),
});

export const buddyInviteSchema = z.object({
  email: emailSchema,
});

export const roastSchema = z.object({
  tier: z.coerce.number().int().min(1).max(5).optional(),
});

export const feedbackSchema = z.object({
  message: z.string().trim().min(3, "Tell us a bit more.").max(2000),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  showOnWall: z.boolean().optional(),
});

export const roleSchema = z.object({
  role: z.enum(["MEMBER", "MODERATOR", "ADMIN"]),
});

export const analyticsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  path: z.string().trim().max(300).optional(),
  meta: z.unknown().optional(),
});
