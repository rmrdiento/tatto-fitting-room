import type { BodyParams } from "../schema/project";

/** Splits a 0..1 slider into min / average / max weights that sum to 1. */
export function tri(t: number): { min: number; avg: number; max: number } {
  const k = Math.min(1, Math.max(0, t));
  const min = Math.max(0, 1 - 2 * k);
  const max = Math.max(0, 2 * k - 1);
  return { min, avg: 1 - min - max, max };
}

/**
 * Morph target weights for body.glb, in the order of `targetNames`.
 * Mirrors MakeHuman macro blending: every target is weighted by the product of
 * its gender, muscle and weight (or height) factors.
 */
export function morphInfluences(
  body: BodyParams,
  targetNames: readonly string[],
): number[] {
  const muscle = tri(body.muscle);
  const weight = tri(body.weight);
  const height = tri(body.height);
  return targetNames.map((name) => {
    const [kind, gender, a, b] = name.split("-") as [
      string,
      string,
      "min" | "avg" | "max" | undefined,
      "min" | "avg" | "max" | undefined,
    ];
    if (gender !== body.sex) return 0;
    if (kind === "sex") return 1;
    if (kind === "u" && a && b) return muscle[a] * weight[b];
    if (kind === "h" && a && a !== "avg") return height[a];
    return 0;
  });
}

const LIGHT =[0xf1, 0xc9, 0xa5] as const;
const DARK = [0x5a, 0x38, 0x25] as const;

/** Maps skinTone 0..1 to a hex colour between light and dark. */
export function skinColor(t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const channel = (i: 0 | 1 | 2) =>
    Math.round(LIGHT[i] + (DARK[i] - LIGHT[i]) * k)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}
