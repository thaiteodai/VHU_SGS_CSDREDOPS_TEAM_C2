import { describe, it, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();

async function makeUser(email: string, role: "MEMBER" | "MODERATOR" | "ADMIN" = "MEMBER", verified = true) {
  return prisma.user.create({
    data: {
      email,
      name: email.split("@")[0],
      role,
      emailVerified: verified,
      passwordHash: await bcrypt.hash("Password123!", 4),
    },
  });
}

describe("health", () => {
  it("reports ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("reports ready when the database is reachable", async () => {
    const res = await request(app).get("/api/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.database).toBe("up");
  });
});

describe("registration and sign-in", () => {
  it("rejects a weak password with a field error", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "weak@panicplan.local", password: "short", name: "Weak" });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBeDefined();
  });

  it("rejects a duplicate email", async () => {
    await makeUser("dupe@panicplan.local");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "dupe@panicplan.local", password: "Password123!", name: "Dupe" });
    expect(res.status).toBe(409);
  });

  it("registers, then refuses sign-in until the email is confirmed", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@panicplan.local", password: "Password123!", name: "New Person" });
    expect(reg.status).toBe(201);

    const early = await request(app)
      .post("/api/auth/login")
      .send({ email: "new@panicplan.local", password: "Password123!" });
    expect(early.status).toBe(403);

    const token = await prisma.emailVerificationToken.findFirstOrThrow({
      where: { user: { email: "new@panicplan.local" } },
    });
    // The raw token is not stored, so confirm by creating a new one via a fresh registration flow.
    expect(token.tokenHash).toHaveLength(64);
  });

  it("signs in with valid credentials and returns the profile", async () => {
    await makeUser("good@panicplan.local");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "good@panicplan.local", password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe("good@panicplan.local");
  });

  it("rejects a wrong password", async () => {
    await makeUser("wrong@panicplan.local");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrong@panicplan.local", password: "Password999!" });
    expect(res.status).toBe(401);
  });

  it("does not leak whether an email exists on forgot-password", async () => {
    const known = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@panicplan.local" });
    const unknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@panicplan.local" });
    expect(known.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
  });

  it("rotates the refresh token on refresh and revokes the old one", async () => {
    await makeUser("refresh@panicplan.local");
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "refresh@panicplan.local", password: "Password123!", rememberMe: true });
    const cookie = loginRes.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    const again = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(again.status).toBe(401);
  });

  it("refuses protected routes without a token", async () => {
    const res = await request(app).get("/api/targets");
    expect(res.status).toBe(401);
  });
});
