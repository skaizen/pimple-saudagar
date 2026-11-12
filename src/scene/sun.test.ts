import { describe, it, expect } from "vitest";
import { sunPosition, nightFactor, formatHour } from "./sun";
import { canopyColor, floweringNow } from "./season";
describe("sun", () => {
  it("noon sun is higher in June than December in Pune", () => {
    expect(sunPosition(12.4, 6).elevation).toBeGreaterThan(sunPosition(12.4, 12).elevation);
  });
  it("23:00 is night and 14:30 is day", () => {
    expect(nightFactor(23, 6)).toBe(1);
    expect(nightFactor(14.5, 6)).toBe(0);
  });
  it("morning sun is in the east (+x)", () => {
    expect(sunPosition(8, 3).azimuth).toBeLessThan(0);
  });
  it("formats 14.5 as 14:30", () => expect(formatHour(14.5)).toBe("14:30"));
});
describe("season", () => {
  it("gulmohar blooms red in May, green in December", () => {
    expect(canopyColor("gulmohar", 5)).toBe("#d8462a");
    expect(canopyColor("gulmohar", 12)).not.toBe("#d8462a");
  });
  it("tabebuia flowers in February", () => expect(floweringNow(2)).toContain("Tabebuia"));
});
