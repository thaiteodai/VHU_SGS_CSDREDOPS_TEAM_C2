import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, targetSchema, fieldErrors } from "../lib/validation.js";

describe("registerSchema", () => {
  it("accepts a sensible registration", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam",
      email: "sam@example.com",
      password: "Password123",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a short password", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam",
      email: "sam@example.com",
      password: "abc",
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrors(parsed.error).password).toMatch(/8 characters/);
  });

  it("rejects a password with no number", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam",
      email: "sam@example.com",
      password: "onlyletters",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a bad email", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam",
      email: "not-an-email",
      password: "Password123",
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrors(parsed.error).email).toBeTruthy();
  });

  it("trims and lowercases the email", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam",
      email: "  SAM@Example.COM ",
      password: "Password123",
    });
    expect(parsed.data.email).toBe("sam@example.com");
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    const parsed = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(parsed.success).toBe(false);
  });
});

describe("targetSchema", () => {
  it("accepts a valid target", () => {
    const parsed = targetSchema.safeParse({
      title: "Ship it",
      dueAt: "2026-10-30T17:00",
      chaosLevel: 3,
      personality: "OVERCONFIDENT_OPTIMIST",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const parsed = targetSchema.safeParse({
      title: "   ",
      dueAt: "2026-10-30T17:00",
      chaosLevel: 3,
      personality: "OVERCONFIDENT_OPTIMIST",
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrors(parsed.error).title).toBeTruthy();
  });

  it("rejects a chaos level outside 1-5", () => {
    const parsed = targetSchema.safeParse({
      title: "Ship it",
      dueAt: "2026-10-30T17:00",
      chaosLevel: 9,
      personality: "OVERCONFIDENT_OPTIMIST",
    });
    expect(parsed.success).toBe(false);
  });
});
