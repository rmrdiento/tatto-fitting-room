import { describe, expect, it } from "vitest";
import type { Layer } from "../schema/project";
import { createEditorStore } from "./store";

const layer = (id: string): Layer => ({
  id,
  imageId: "img",
  u: 0.5,
  v: 0.5,
  widthCm: 8,
  frame: { right: [1, 0], up: [0, 1] },
  rotation: 0,
  opacity: 1,
  mirrored: false,
  old: false,
  visible: true,
});

describe("editor store", () => {
  it("adds a layer, selects it, and undoes/redoes", () => {
    const store = createEditorStore();
    store.getState().addLayer(layer("a"));
    expect(store.getState().layers).toHaveLength(1);
    expect(store.getState().selectedId).toBe("a");

    store.getState().undo();
    expect(store.getState().layers).toHaveLength(0);
    expect(store.getState().selectedId).toBeNull();

    store.getState().redo();
    expect(store.getState().layers.map((l) => l.id)).toEqual(["a"]);
  });

  it("collapses a drag into one undo step via checkpoint", () => {
    const store = createEditorStore();
    store.getState().addLayer(layer("a"));
    store.getState().checkpoint();
    for (const u of [0.1, 0.2, 0.3]) store.getState().updateLayer("a", { u });
    expect(store.getState().layers[0]?.u).toBe(0.3);

    store.getState().undo();
    expect(store.getState().layers[0]?.u).toBe(0.5);
  });

  it("clears the redo stack after a new edit", () => {
    const store = createEditorStore();
    store.getState().addLayer(layer("a"));
    store.getState().undo();
    store.getState().addLayer(layer("b"));
    expect(store.getState().future).toHaveLength(0);
  });

  it("removes a layer and restores it on undo", () => {
    const store = createEditorStore();
    store.getState().addLayer(layer("a"));
    store.getState().removeLayer("a");
    expect(store.getState().layers).toHaveLength(0);
    store.getState().undo();
    expect(store.getState().layers.map((l) => l.id)).toEqual(["a"]);
  });

  it("undo with empty history is a no-op", () => {
    const store = createEditorStore();
    store.getState().undo();
    expect(store.getState().layers).toHaveLength(0);
  });
});
