import type { Layer } from "../schema/project";

export interface TattooImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

export type ViewMode = "after" | "before";

export interface ComposeOptions {
  size: number;
  skinColor: string;
  mode: ViewMode;
  /** World length of one U unit divided by world length of one V unit. */
  uvAspect?: number;
}

/**
 * Draws skin + visible tattoo layers into a UV-space canvas.
 * Layer array order is draw order (last on top). Texture is expected to use
 * flipY, so v = 1 is the top row of the canvas.
 */
export function compose(
  ctx: Ctx2D,
  layers: readonly Layer[],
  images: Readonly<Record<string, TattooImage>>,
  { size, skinColor, mode, uvAspect = 1 }: ComposeOptions,
): void {
  ctx.globalAlpha = 1;
  ctx.fillStyle = skinColor;
  ctx.fillRect(0, 0, size, size);

  for (const layer of layers) {
    if (!layer.visible) continue;
    if (mode === "before" && !layer.old) continue;
    const image = images[layer.imageId];
    if (!image || image.width === 0) continue;

    const w = layer.scale * size;
    const h = w * (image.height / image.width) * uvAspect;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.u * size, (1 - layer.v) * size);
    ctx.rotate(layer.rotation);
    ctx.scale(layer.mirrored ? -1 : 1, 1);
    ctx.drawImage(image.source, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
