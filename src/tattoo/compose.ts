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
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
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
}

/**
 * Draws skin + visible tattoo layers into a UV-space canvas.
 * Layer array order is draw order (last on top). Texture is expected to use
 * flipY, so v = 1 is the top row of the canvas. Local tattoo space is in
 * metres with x to the right and y down.
 */
export function compose(
  ctx: Ctx2D,
  layers: readonly Layer[],
  images: Readonly<Record<string, TattooImage>>,
  { size, skinColor, mode }: ComposeOptions,
): void {
  ctx.globalAlpha = 1;
  ctx.fillStyle = skinColor;
  ctx.fillRect(0, 0, size, size);

  for (const layer of layers) {
    if (!layer.visible) continue;
    if (mode === "before" && !layer.old) continue;
    const image = images[layer.imageId];
    if (!image || image.width === 0) continue;

    // Drawn in metres on the surface: the frame maps surface metres to UV, so
    // the tattoo keeps its real size and stays upright on any part of the atlas.
    const w = layer.widthCm / 100;
    const h = w * (image.height / image.width);
    const { right, up } = layer.frame;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.u * size, (1 - layer.v) * size);
    ctx.transform(
      right[0] * size,
      -right[1] * size,
      -up[0] * size,
      up[1] * size,
      0,
      0,
    );
    ctx.rotate(layer.rotation);
    ctx.scale(layer.mirrored ? -1 : 1, 1);
    ctx.drawImage(image.source, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
