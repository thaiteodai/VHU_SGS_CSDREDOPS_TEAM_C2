import { describe, it, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();

async function makeUser(email: string, role: "MEMBER" | "MODERATOR" | "ADMIN" = "MEMBER") {
  return prisma.user.create({
    data: {
      email,
      name: email.split("@")[0],
      role,
      emailVerified: true,
      passwordHash: await bcrypt.hash("Password123!", 4),
    },
  });
}

async function tokenFor(email: string) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Password123!" });
  return res.body.accessToken as string;
}

async function createTarget(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/targets")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Ship the thing",
      dueAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      chaosLevel: 3,
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body.target;
}

describe("targets", () => {
  it("creates a target and returns the derived panic state", async () => {
    const owner = await makeUser("owner@panicplan.local");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);

    expect(target.title).toBe("Ship the thing");
    expect(target.status).toBe("OPEN");
    expect(target.isOwner).toBe(true);
    expect(target.tier).toBeGreaterThanOrEqual(1);
    expect(target.tier).toBeLessThanOrEqual(5);
    expect(target.panic).toBeGreaterThanOrEqual(0);
    expect(target.panic).toBeLessThanOrEqual(100);
  });

  it("rejects an invalid chaos level", async () => {
    const owner = await makeUser("chaos@panicplan.local");
    const token = await tokenFor(owner.email);
    const res = await request(app)
      .post("/api/targets")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "x", dueAt: new Date().toISOString(), chaosLevel: 99 });
    expect(res.status).toBe(400);
  });

  it("does not let a stranger read a target", async () => {
    const owner = await makeUser("owner2@panicplan.local");
    const stranger = await makeUser("stranger@panicplan.local");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);

    const res = await request(app)
      .get(`/api/targets/${target.id}`)
      .set("Authorization", `Bearer ${await tokenFor(stranger.email)}`);
    expect(res.status).toBe(403);
  });

  it("does not let a stranger edit or delete a target", async () => {
    const owner = await makeUser("owner3@panicplan.local");
    const stranger = await makeUser("stranger2@panicplan.local");
    const target = await createTarget(await tokenFor(owner.email));
    const strangerToken = await tokenFor(stranger.email);

    const patch = await request(app)
      .patch(`/api/targets/${target.id}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ title: "hijacked" });
    expect(patch.status).toBe(403);

    const del = await request(app)
      .delete(`/api/targets/${target.id}`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(del.status).toBe(403);
  });

  it("completes a target and stamps completedAt", async () => {
    const owner = await makeUser("owner4@panicplan.local");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);

    const res = await request(app)
      .post(`/api/targets/${target.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.target.status).toBe("COMPLETED");
    expect(res.body.target.completedAt).toBeTruthy();
  });

  it("adds and toggles steps", async () => {
    const owner = await makeUser("owner5@panicplan.local");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);

    const step = await request(app)
      .post(`/api/targets/${target.id}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "Write the thing" });
    expect(step.status).toBe(201);

    const toggle = await request(app)
      .patch(`/api/targets/${target.id}/steps/${step.body.step.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ done: true });
    expect(toggle.status).toBe(200);
    expect(toggle.body.step.done).toBe(true);
  });

  it("invites a buddy, and the buddy can then see the target", async () => {
    const owner = await makeUser("owner6@panicplan.local");
    const buddy = await makeUser("buddy@panicplan.local");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);

    const invite = await request(app)
      .post(`/api/targets/${target.id}/buddies`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: buddy.email });
    expect(invite.status).toBe(201);

    const buddyToken = await tokenFor(buddy.email);
    const accept = await request(app)
      .post(`/api/targets/${target.id}/buddies/${invite.body.buddy.id}/respond`)
      .set("Authorization", `Bearer ${buddyToken}`)
      .send({ status: "ACCEPTED" });
    expect(accept.status).toBe(200);

    const view = await request(app)
      .get(`/api/targets/${target.id}`)
      .set("Authorization", `Bearer ${buddyToken}`);
    expect(view.status).toBe(200);
    expect(view.body.target.isOwner).toBe(false);
  });

  it("only lets the owner invite buddies", async () => {
    const owner = await makeUser("owner7@panicplan.local");
    const other = await makeUser("other@panicplan.local");
    const target = await createTarget(await tokenFor(owner.email));

    const res = await request(app)
      .post(`/api/targets/${target.id}/buddies`)
      .set("Authorization", `Bearer ${await tokenFor(other.email)}`)
      .send({ email: "someone@panicplan.local" });
    expect(res.status).toBe(403);
  });

  it("lets a buddy roast but not a stranger", async () => {
    const owner = await makeUser("owner8@panicplan.local");
    const buddy = await makeUser("buddy2@panicplan.local");
    const stranger = await makeUser("stranger3@panicplan.local");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);

    const invite = await request(app)
      .post(`/api/targets/${target.id}/buddies`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: buddy.email });
    const buddyToken = await tokenFor(buddy.email);
    await request(app)
      .post(`/api/targets/${target.id}/buddies/${invite.body.buddy.id}/respond`)
      .set("Authorization", `Bearer ${buddyToken}`)
      .send({ status: "ACCEPTED" });

    const roast = await request(app)
      .post(`/api/targets/${target.id}/roasts`)
      .set("Authorization", `Bearer ${buddyToken}`)
      .send({});
    expect(roast.status).toBe(201);
    expect(roast.body.roast.body).toBeTruthy();
    expect(roast.body.tier).toBeGreaterThanOrEqual(1);

    const blocked = await request(app)
      .post(`/api/targets/${target.id}/roasts`)
      .set("Authorization", `Bearer ${await tokenFor(stranger.email)}`)
      .send({});
    expect(blocked.status).toBe(403);
  });

  it("only lets a moderator hide a roast", async () => {
    const owner = await makeUser("owner9@panicplan.local");
    const mod = await makeUser("mod@panicplan.local", "MODERATOR");
    const token = await tokenFor(owner.email);
    const target = await createTarget(token);
    const roast = await request(app)
      .post(`/api/targets/${target.id}/roasts`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const blocked = await request(app)
      .delete(`/api/targets/${target.id}/roasts/${roast.body.roast.id}`)
      .set("Authorization", `Bearer ${await tokenFor(owner.email)}`);
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .delete(`/api/targets/${target.id}/roasts/${roast.body.roast.id}`)
      .set("Authorization", `Bearer ${await tokenFor(mod.email)}`);
    expect(allowed.status).toBe(200);
  });
});

describe("wall of shame", () => {
  it("only lists members who opted in", async () => {
    const opted = await makeUser("opted@panicplan.local");
    const quiet = await makeUser("private@panicplan.local");
    await prisma.user.update({ where: { id: opted.id }, data: { showOnWall: true } });

    const target = await createTarget(await tokenFor(opted.email), {
      dueAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
    await createTarget(await tokenFor(quiet.email), {
      title: "Secret overdue thing",
      dueAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    });

    const res = await request(app)
      .get("/api/shame")
      .set("Authorization", `Bearer ${await tokenFor(opted.email)}`);
    expect(res.status).toBe(200);
    expect(res.body.entries.map((e: { title: string }) => e.title)).toContain(target.title);
    expect(res.body.entries.map((e: { title: string }) => e.title)).not.toContain("Secret overdue thing");
  });
});

describe("privacy", () => {
  it("exports the member's own data", async () => {
    const user = await makeUser("export@panicplan.local");
    const token = await tokenFor(user.email);
    await createTarget(token);

    const res = await request(app)
      .get("/api/users/me/export")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(Array.isArray(res.body.data.targets)).toBe(true);
  });

  it("deletes on request and scrubs the identifiers", async () => {
    const user = await makeUser("delete@panicplan.local");
    const token = await tokenFor(user.email);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.deletedAt).toBeTruthy();
    expect(after?.email).toContain("deleted-");
    expect(after?.passwordHash).toBeNull();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "delete@panicplan.local", password: "Password123!" });
    expect(login.status).toBe(401);
  });
});
