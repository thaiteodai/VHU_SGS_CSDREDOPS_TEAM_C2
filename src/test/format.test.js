import { describe, it, expect } from "vitest";
import { countdown, panicLabel, formatDate } from "../lib/format.js";

describe("countdown", () => {
  it("counts down hours inside a day", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const due = new Date("2026-10-22T20:00:00Z");
    expect(countdown(due, now).text).toBe("8h left");
  });

  it("counts down days beyond a day", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const due = new Date("2026-10-25T12:00:00Z");
    expect(countdown(due, now).text).toBe("3d left");
  });

  it("flags overdue targets", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const due = new Date("2026-10-20T12:00:00Z");
    const result = countdown(due, now);
    expect(result.overdue).toBe(true);
    expect(result.text).toBe("2d overdue");
  });

  it("marks the last two days as urgent", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const due = new Date("2026-10-23T12:00:00Z");
    expect(countdown(due, now).urgent).toBe(true);
  });
});

describe("panicLabel", () => {
  it("escalates with the tier", () => {
    expect(panicLabel(10, 1)).toBe("CHILL");
    expect(panicLabel(90, 4)).toBe("GETTING REAL");
    expect(panicLabel(90, 5)).toBe("CODE RED");
  });
});

describe("formatDate", () => {
  it("returns an empty string for nothing", () => {
    expect(formatDate(null)).toBe("");
  });

  it("formats a date", () => {
    expect(formatDate("2026-10-22T12:00:00Z")).toMatch(/2026/);
  });
});
