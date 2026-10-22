import { describe, it, expect } from "vitest";
import {
  baseTier,
  tierFor,
  buildRoast,
  daysUntil,
  tierMeta,
  PERSONALITIES,
} from "../src/services/roast.service.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86400000);

describe("base tier from the clock", () => {
  it("is polite when the deadline is far away", () => {
    expect(baseTier(days(30), NOW)).toBe(1);
  });

  it("is passive-aggressive a few days out", () => {
    expect(baseTier(days(5), NOW)).toBe(2);
  });

  it("is legal inside three days", () => {
    expect(baseTier(days(2), NOW)).toBe(3);
  });

  it("is desperate inside a day", () => {
    expect(baseTier(days(0.5), NOW)).toBe(4);
  });

  it("is cosmic once overdue", () => {
    expect(baseTier(days(-1), NOW)).toBe(5);
  });
});

describe("chaos level shifts the tier", () => {
  it("softens by one at chaos 1", () => {
    expect(tierFor(days(5), 1, NOW)).toBe(1);
  });

  it("keeps the clock at chaos 3", () => {
    expect(tierFor(days(5), 3, NOW)).toBe(2);
  });

  it("sharpens by one at chaos 5", () => {
    expect(tierFor(days(5), 5, NOW)).toBe(3);
  });

  it("never leaves the 1-5 range", () => {
    expect(tierFor(days(-10), 1, NOW)).toBe(4);
    expect(tierFor(days(90), 5, NOW)).toBe(2);
  });
});

describe("buildRoast", () => {
  it("produces body copy that names the target and the time left", () => {
    const roast = buildRoast({
      title: "Fix the leaking tap",
      dueAt: days(3),
      chaosLevel: 3,
      personality: "OVERCONFIDENT_OPTIMIST",
      now: NOW,
    });
    expect(roast.body).toContain("Fix the leaking tap");
    expect(roast.body).toMatch(/in \d+ day/);
    expect(roast.tier).toBeGreaterThanOrEqual(1);
    expect(roast.tier).toBeLessThanOrEqual(5);
  });

  it("is deterministic for the same seed", () => {
    const args = {
      title: "Same target",
      dueAt: days(4),
      chaosLevel: 3,
      personality: "SILENT_SLOBBER" as const,
      now: NOW,
      seed: 42,
    };
    expect(buildRoast(args).body).toBe(buildRoast(args).body);
    expect(buildRoast(args).memeTop).toBe(buildRoast(args).memeTop);
  });

  it("changes tone between tiers", () => {
    const early = buildRoast({ title: "T", dueAt: days(20), chaosLevel: 3, personality: "SILENT_SLOBBER", now: NOW, seed: 1 });
    const late = buildRoast({ title: "T", dueAt: days(-1), chaosLevel: 3, personality: "SILENT_SLOBBER", now: NOW, seed: 1 });
    expect(early.tier).toBeLessThan(late.tier);
    expect(early.body).not.toBe(late.body);
  });

  it("keeps every personality available", () => {
    for (const p of PERSONALITIES) {
      const roast = buildRoast({
        title: "Thing",
        dueAt: days(2),
        chaosLevel: 3,
        personality: p.key,
        now: NOW,
      });
      expect(roast.body.length).toBeGreaterThan(10);
    }
  });

  it("produces a meme caption within safe lengths", () => {
    const roast = buildRoast({
      title: "A very long target title that goes on and on and on for quite a while indeed",
      dueAt: days(1),
      chaosLevel: 5,
      personality: "LAST_MINUTE_PANIC",
      now: NOW,
    });
    expect(roast.memeTop.length).toBeLessThanOrEqual(120);
    expect(roast.memeBottom.length).toBeLessThanOrEqual(90);
  });
});

describe("helpers", () => {
  it("computes days until a deadline", () => {
    expect(Math.round(daysUntil(days(3), NOW))).toBe(3);
    expect(Math.round(daysUntil(days(-2), NOW))).toBe(-2);
  });

  it("maps a tier to its metadata", () => {
    expect(tierMeta(5).key).toBe("COSMIC");
    expect(tierMeta(1).label).toBe("Polite");
  });
});
