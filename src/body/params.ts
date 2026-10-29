const LIGHT = [0xf1, 0xc9, 0xa5] as const;
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
