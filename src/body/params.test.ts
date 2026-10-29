import { describe, expect, it } from "vitest";
import { skinColor } from "./params";

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
