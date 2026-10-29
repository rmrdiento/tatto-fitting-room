import { describe, expect, it } from "vitest";
import { defaultBody } from "../schema/project";
import { morphInfluences, skinColor, tri } from "./params";

describe("skinColor", () => {
  it("returns the light and dark endpoints", () => {
    expect(skinColor(0)).toBe("#f1c9a5");
    expect(skinColor(1)).toBe("#5a3825");
  });

  it("clamps out-of-range input", () => {
    expect(skinColor(-3)).toBe("#f1c9a5");
    expect(skinColor(9)).toBe("#5a3825");
  });
});

describe("tri", () => {
  it("is min at 0, avg at 0.5, max at 1 and always sums to 1", () => {
    expect(tri(0)).toEqual({ min: 1, avg: 0, max: 0 });
    expect(tri(0.5)).toEqual({ min: 0, avg: 1, max: 0 });
    expect(tri(1)).toEqual({ min: 0, avg: 0, max: 1 });
    const t = tri(0.8);
    expect(t.min + t.avg + t.max).toBeCloseTo(1);
  });
});

describe("morphInfluences", () => {
  const names = [
    "sex-female",
    "sex-male",
    "u-female-min-min",
    "u-female-avg-max",
    "u-male-avg-max",
    "h-female-min",
    "h-female-max",
  ];

  it("activates only the selected sex", () => {
    const w = morphInfluences({ ...defaultBody, sex: "female" }, names);
    expect(w[0]).toBe(1);
    expect(w[1]).toBe(0);
    expect(w[4]).toBe(0);
  });

  it("is all zero for the average body except the sex target", () => {
    const w = morphInfluences(
      { ...defaultBody, sex: "female", muscle: 0.5, weight: 0.5, height: 0.5 },
      names,
    );
    expect(w).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it("blends weight at average muscle and height extremes", () => {
    const w = morphInfluences(
      { ...defaultBody, sex: "female", muscle: 0.5, weight: 1, height: 1 },
      names,
    );
    expect(w[3]).toBe(1);
    expect(w[6]).toBe(1);
    expect(w[5]).toBe(0);
  });

  it("multiplies muscle and weight factors", () => {
    const w = morphInfluences(
      { ...defaultBody, sex: "female", muscle: 0, weight: 0, height: 0.5 },
      names,
    );
    expect(w[2]).toBe(1);
  });
});
