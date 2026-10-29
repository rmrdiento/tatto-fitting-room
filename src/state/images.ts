import { create } from "zustand";
import type { TattooImage } from "../tattoo/compose";

interface ImageState {
  images: Record<string, TattooImage>;
  urls: Record<string, string>;
  /** Image the next click on the body will place. */
  armed: string | null;
  load(id: string, url: string): Promise<void>;
  arm(id: string | null): void;
}

export const useImages = create<ImageState>()((set, get) => ({
  images: {},
  urls: {},
  armed: null,
  load: async (id, url) => {
    if (get().images[id]) return;
    const img = new Image();
    img.src = url;
    await img.decode();
    set((s) => ({
      images: {
        ...s.images,
        [id]: {
          source: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
        },
      },
      urls: { ...s.urls, [id]: url },
    }));
  },
  arm: (armed) => set({ armed }),
}));
