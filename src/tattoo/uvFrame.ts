export type V2 = readonly [number, number];
export type V3 = readonly [number, number, number];

/**
 * UV displacement per metre of surface travel, along the surface's local
 * "right" and "up" directions. Lets a tattoo of real-world size be drawn
 * correctly on any region of the UV atlas, including stretched or rotated ones.
 */
export interface UvFrame {
  right: [number, number];
  up: [number, number];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-12 ? [0, 0, 0] : scale(a, 1 / l);
};

const WORLD_UP: V3 = [0, 1, 0];
const FALLBACK_UP: V3 = [0, 0, -1];

/**
 * Computes the UV frame for a triangle (outward-facing, counter-clockwise).
 * `up` follows world +Y projected onto the surface; on near-horizontal
 * surfaces (top of head/shoulders) it falls back to world -Z.
 * Returns null for a degenerate triangle.
 */
export function uvFrame(p: readonly [V3, V3, V3], t: readonly [V2, V2, V2]): UvFrame | null {
  const e1 = sub(p[1], p[0]);
  const e2 = sub(p[2], p[0]);
  const d1: V2 = [t[1][0] - t[0][0], t[1][1] - t[0][1]];
  const d2: V2 = [t[2][0] - t[0][0], t[2][1] - t[0][1]];
  const det = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(det) < 1e-14) return null;

  // Surface vectors per unit U and per unit V.
  const pu = scale(sub(scale(e1, d2[1]), scale(e2, d1[1])), 1 / det);
  const pv = scale(sub(scale(e2, d1[0]), scale(e1, d2[0])), 1 / det);

  const n = norm(cross(e1, e2));
  if (dot(n, n) === 0) return null;

  let up = norm(sub(WORLD_UP, scale(n, dot(WORLD_UP, n))));
  if (dot(up, up) < 0.25) up = norm(sub(FALLBACK_UP, scale(n, dot(FALLBACK_UP, n))));
  const right = norm(cross(up, n));

  // Express a surface vector w as a*pu + b*pv (least squares, 2x2 normal equations).
  const a11 = dot(pu, pu);
  const a12 = dot(pu, pv);
  const a22 = dot(pv, pv);
  const inv = a11 * a22 - a12 * a12;
  if (Math.abs(inv) < 1e-18) return null;
  const toUv = (w: V3): [number, number] => {
    const r1 = dot(pu, w);
    const r2 = dot(pv, w);
    return [(a22 * r1 - a12 * r2) / inv, (a11 * r2 - a12 * r1) / inv];
  };

  return { right: toUv(right), up: toUv(up) };
}
