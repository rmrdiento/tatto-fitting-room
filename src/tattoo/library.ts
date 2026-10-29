export interface LibraryItem {
  id: string;
  name: string;
  url: string;
}

/** Original placeholder artwork, CC0. See LICENSES.md. */
export const library: readonly LibraryItem[] = [
  { id: "lib-star", name: "Star", url: "/tattoos/star.svg" },
  { id: "lib-heart", name: "Heart", url: "/tattoos/heart.svg" },
  { id: "lib-cross", name: "Cross", url: "/tattoos/cross.svg" },
];
