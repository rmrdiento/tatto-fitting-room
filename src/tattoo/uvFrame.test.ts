import { describe, expect, it } from "vitest";
import { uvFrame, type V2, type V3 } from "./uvFrame";

// Triangle in the XY plane facing +Z, 1 m legs.
const tri: [V3, V3, V3] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
];

const close = (a: readonly number[], b: readonly number[]) =>
  a.forEach((x, i) => expect(x).toBeCloseTo(b[i]!, 6));

describe("uvFrame", () => {
  it("maps metres to UV 1:1 for an aligned chart", () => {
    const uv: [V2, V2, V2] = [[0, 0], [1, 0], [0, 1]];
    const f = uvFrame(tri, uv)!;
    close(f.right, [1, 0]);
    close(f.up, [0, 1]);
  });

  it("scales with chart density (0.1 UV per metre)", () => {
    const uv: [V2, V2, V2] = [[0, 0], [0.1, 0], [0, 0.1]];
    const f = uvFrame(tri, uv)!;
    close(f.right, [0.1, 0]);
    close(f.up, [0, 0.1]);
  });

  it("handles anisotropic stretch (U twice as dense as V)", () => {
    const uv: [V2, V2, V2] = [[0, 0], [0.2, 0], [0, 0.1]];
    const f = uvFrame(tri, uv)!;
    close(f.right, [0.2, 0]);
    close(f.up, [0, 0.1]);
  });

  it("keeps up pointing up when the chart is rotated 90 degrees", () => {
    // Chart rotated: world +X -> UV +V, world +Y -> UV -U.
    const uv: [V2, V2, V2] = [[0, 0], [0, 1], [-1, 0]];
    const f = uvFrame(tri, uv)!;
    close(f.right, [0, 1]);
    close(f.up, [-1, 0]);
  });

  it("returns null for a degenerate UV triangle", () => {
    const uv: [V2, V2, V2] = [[0, 0], [0.5, 0.5], [1, 1]];
    expect(uvFrame(tri, uv)).toBeNull();
  });

  it("falls back to -Z for up on a horizontal surface", () => {
    // Triangle in the XZ plane facing +Y.
    const flat: [V3, V3, V3] = [[0, 0, 0], [1, 0, 0], [0, 0, -1]];
    const uv: [V2, V2, V2] = [[0, 0], [1, 0], [0, 1]];
    const f = uvFrame(flat, uv)!;
    close(f.up, [0, 1]);
    close(f.right, [1, 0]);
  });
});
