import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { defaultBody, type BodyParams, type Layer } from "../schema/project";
import type { ViewMode } from "../tattoo/compose";

interface Snapshot {
  body: BodyParams;
  layers: Layer[];
}

export interface EditorState extends Snapshot {
  past: Snapshot[];
  future: Snapshot[];
  selectedId: string | null;
  mode: ViewMode;
  /** Records one undo step; call once before a continuous edit such as a drag. */
  checkpoint(): void;
  addLayer(layer: Layer): void;
  updateLayer(id: string, patch: Partial<Omit<Layer, "id">>): void;
  removeLayer(id: string): void;
  setBody(patch: Partial<BodyParams>): void;
  select(id: string | null): void;
  setMode(mode: ViewMode): void;
  undo(): void;
  redo(): void;
}

const HISTORY_LIMIT = 100;

export function createEditorStore() {
  return createStore<EditorState>()((set, get) => {
    const snapshot = (): Snapshot => ({
      body: get().body,
      layers: get().layers,
    });
    const record = () =>
      set((s) => ({
        past: [...s.past, snapshot()].slice(-HISTORY_LIMIT),
        future: [],
      }));

    return {
      body: defaultBody,
      layers: [],
      past: [],
      future: [],
      selectedId: null,
      mode: "after",

      checkpoint: record,

      addLayer: (layer) => {
        record();
        set((s) => ({ layers: [...s.layers, layer], selectedId: layer.id }));
      },
      updateLayer: (id, patch) =>
        set((s) => ({
          layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      removeLayer: (id) => {
        record();
        set((s) => ({
          layers: s.layers.filter((l) => l.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }));
      },
      setBody: (patch) => set((s) => ({ body: { ...s.body, ...patch } })),
      select: (id) => set({ selectedId: id }),
      setMode: (mode) => set({ mode }),

      undo: () => {
        const { past } = get();
        const prev = past[past.length - 1];
        if (!prev) return;
        set((s) => ({
          ...prev,
          past: past.slice(0, -1),
          future: [snapshot(), ...s.future],
          selectedId: prev.layers.some((l) => l.id === s.selectedId)
            ? s.selectedId
            : null,
        }));
      },
      redo: () => {
        const [next, ...rest] = get().future;
        if (!next) return;
        set((s) => ({
          ...next,
          past: [...s.past, snapshot()],
          future: rest,
        }));
      },
    };
  });
}

export const editorStore = createEditorStore();

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(editorStore, selector);
}
