import { describe, expect, it } from "vitest";
import type { Layer } from "../schema/project";
import { compose, type Ctx2D, type TattooImage } from "./compose";

function recorder() {
  const calls: string[] = [];
  const alphas: number[] = [];
  const ctx: Ctx2D = {
    fillStyle: "",
    globalAlpha: 1,
    fillRect: (x, y, w, h) => calls.push(`fillRect ${x},${y},${w},${h}`),
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    translate: (x, y) => calls.push(`translate ${x},${y}`),
    rotate: (a) => calls.push(`rotate ${a}`),
    scale: (x, y) => calls.push(`scale ${x},${y}`),
    drawImage: (_i, dx, dy, dw, dh) => {
      alphas.push(ctx.globalAlpha);
      calls.push(`drawImage ${dx},${dy},${dw},${dh}`);
    },
  };
  return { ctx, calls, alphas };
}

const image: TattooImage = {
  source: {} as CanvasImageSource,
  width: 100,
  height: 50,
};

const layer = (over: Partial<Layer> = {}): Layer => ({
  id: "l1",
  imageId: "img",
  u: 0.5,
  v: 0.75,
  scale: 0.2,
  rotation: 0,
  opacity: 0.8,
  mirrored: false,
  old: false,
  visible: true,
  ...over,
});

const opts = { size: 1000, skinColor: "#c68642", mode: "after" as const };

describe("compose", () => {
  it("fills skin and draws a layer centred on its UV (v flipped)", () => {
    const { ctx, calls, alphas } = recorder();
    compose(ctx, [layer()], { img: image }, opts);
    expect(calls).toEqual([
      "fillRect 0,0,1000,1000",
      "save",
      "translate 500,250",
      "rotate 0",
      "scale 1,1",
      "drawImage -100,-50,200,100",
      "restore",
    ]);
    expect(alphas).toEqual([0.8]);
  });

  it("mirrors horizontally", () => {
    const { ctx, calls } = recorder();
    compose(ctx, [layer({ mirrored: true })], { img: image }, opts);
    expect(calls).toContain("scale -1,1");
  });

  it("skips hidden layers and layers with missing images", () => {
    const { ctx, calls } = recorder();
    compose(
      ctx,
      [layer({ visible: false }), layer({ imageId: "nope" })],
      { img: image },
      opts,
    );
    expect(calls).toEqual(["fillRect 0,0,1000,1000"]);
  });

  it("in 'before' mode draws only old layers", () => {
    const { ctx, calls } = recorder();
    compose(
      ctx,
      [layer({ id: "a", old: true }), layer({ id: "b", old: false })],
      { img: image },
      { ...opts, mode: "before" },
    );
    expect(calls.filter((c) => c.startsWith("drawImage"))).toHaveLength(1);
  });

  it("applies UV aspect compensation to height only", () => {
    const { ctx, calls } = recorder();
    compose(ctx, [layer()], { img: image }, { ...opts, uvAspect: 2 });
    expect(calls).toContain("drawImage -100,-100,200,200");
  });
});
